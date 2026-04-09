// import da lib de criptografar senha
import bcrypt from "bcryptjs";
// import da lib de token jwt
import jwt from "jsonwebtoken";
import { findUserByEmail } from "../services/userService.js";
import { loginSchema } from "../validators/authValidator.js";
import { env } from "../config/env.js";

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1h — alinhado com o expiresIn do JWT

const setAccessTokenCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      roleId: user.roleId || user.role_id,
      role: user.role_nome || "user",
      permissions: user.role?.permissions || [],
    },
    env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      refresh: true,
    },
    env.JWT_REFRESH_SECRET,
    { algorithm: 'HS256', expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export class AuthController {
  static async login(req, res) {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        const firstErrorMessage = result.error.errors[0]?.message || "Dados inválidos";
        return res.status(400).json({ 
          message: firstErrorMessage, 
          errors: result.error.errors.map(err => ({ field: err.path[0], message: err.message })) 
        });
      }

      const { email, password } = result.data;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      // Ambos os tokens via cookies httpOnly — sem exposição ao JS
      setAccessTokenCookie(res, accessToken);
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role_nome,
          permissions: user.role?.permissions || [],
        },
      });
    } catch (err) {
      console.error("ERRO NO LOGIN:", err);
      return res.status(500).json({ message: "Erro interno do servidor ao realizar login." });
    }
  }

  static async refresh(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token não encontrado" });
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
      const user = await findUserByEmail(decoded.email);

      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      setAccessTokenCookie(res, accessToken);
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/auth",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ message: "Token renovado com sucesso" });
    } catch (err) {
      return res.status(401).json({ message: "Refresh token inválido ou expirado" });
    }
  }

  static async logout(req, res) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/auth" });
    return res.json({ message: "Logout realizado com sucesso" });
  }

  static async me(req, res) {
    try {
      const email = req.user?.email;
      if (!email) return res.status(401).json({ message: "Não autorizado" });

      const user = await findUserByEmail(email);
      if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

      return res.json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role_nome,
        roleId: user.role_id,
        permissions: user.role?.permissions || []
      });
    } catch (err) {
      console.error("ERRO EM /auth/me:", err);
      return res.status(500).json({ message: "Erro interno ao buscar sessão." });
    }
  }
}

export default AuthController;
