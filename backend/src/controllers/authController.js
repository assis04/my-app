import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, changeFirstPassword } from "../services/userService.js";
import { loginSchema, changePasswordSchema } from "../validators/authValidator.js";
import { env } from "../config/env.js";
import {
  blacklistAccessToken,
  storeRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
} from "../utils/tokenBlacklist.js";

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
      filialId: user.filialId || null,
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

      await storeRefreshToken(user.id, refreshToken);

      return res.json({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role_nome,
          permissions: user.role?.permissions || [],
          mustChangePassword: !!user.mustChangePassword,
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

      // Verificar se este refresh token ainda é válido (não foi rotacionado/revogado)
      const isValid = await isRefreshTokenValid(decoded.id, refreshToken);
      if (!isValid) {
        return res.status(401).json({ message: "Refresh token revogado" });
      }

      const user = await findUserByEmail(decoded.email);

      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      // Armazenar novo refresh token (invalida o anterior automaticamente)
      await storeRefreshToken(user.id, newRefreshToken);

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
    try {
      // Blacklist access token
      const accessToken = req.cookies?.accessToken;
      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
          await blacklistAccessToken(accessToken, decoded);
          await revokeRefreshToken(decoded.id);
        } catch {
          // Token inválido/expirado — não precisa blacklistar
        }
      }
    } catch {
      // Redis indisponível — continua o logout normalmente
    }

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
        permissions: user.role?.permissions || [],
        mustChangePassword: !!user.mustChangePassword,
      });
    } catch (err) {
      console.error("ERRO EM /auth/me:", err);
      return res.status(500).json({ message: "Erro interno ao buscar sessão." });
    }
  }
  static async forceChangePassword(req, res) {
    try {
      const result = changePasswordSchema.safeParse(req.body);

      if (!result.success) {
        const firstErrorMessage = result.error.errors[0]?.message || "Dados inválidos";
        return res.status(400).json({
          message: firstErrorMessage,
          errors: result.error.errors.map(err => ({ field: err.path[0], message: err.message })),
        });
      }

      await changeFirstPassword(req.user.id, result.data);

      return res.json({ message: "Senha alterada com sucesso" });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      console.error("ERRO EM /auth/change-password:", err);
      return res.status(500).json({ message: "Erro interno ao alterar senha." });
    }
  }
}

export default AuthController;
