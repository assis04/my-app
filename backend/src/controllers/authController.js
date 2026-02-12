// import da lib de criptografar senha
import bcrypt from "bcryptjs";
// import da lib de token jwt
import jwt from "jsonwebtoken";
//import das class de buscar email no banco e de criar usuario
import { findUserByEmail, createUser } from "../services/userService.js";


export class AuthController {
  static async register(req, res) {
    try {
      const { nome, email, password, role_id } = req.body || {};

      if (!nome || !email || !password || !role_id) {
        return res.status(400).json({ message: "Dados obrigatórios faltando" });
      }
      const normalizedEmail = email.trim().toLowerCase();

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: "Email inválido!" });
      }

      const userExists = await findUserByEmail(normalizedEmail);
      if (userExists) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const passwordRules = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!passwordRules.test(password)) {
        return res.status(400).json({
          error:
            "Password must be >=8 chars, include uppercase, lowercase, number and special char",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await createUser(
        nome.trim(),
        normalizedEmail,
        hashedPassword,
        role_id, // Envia o ID numérico
      );

      return res
        .status(201)
        .json({ message: "Usuário criado com sucesso", user });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Corpo da requisição inválido ou vazio." });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const user = await findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role_nome || "user", // Usa o nome que veio do JOIN
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const tokenRefresh = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role_nome || "user",
          refresh: true
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
      );
      


      return res.json({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role_nome, // Envia o texto (ex: 'admin') para o front controlar o menu
          roleId: user.role_id, // Envia o ID caso precises
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
}

export default AuthController;
