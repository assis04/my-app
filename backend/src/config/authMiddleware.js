import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { isTokenBlacklisted } from '../utils/tokenBlacklist.js';

export async function authMiddleware(req, res, next) {
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

    if (decoded.refresh === true) {
      return res.status(401).json({ message: 'Token inválido: refresh token não pode ser usado como access token.' });
    }

    // Verificar se o token foi invalidado (logout)
    try {
      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        return res.status(401).json({ message: 'Token revogado' });
      }
    } catch {
      // Redis indisponível — aceita o token (fail-open para não derrubar o sistema)
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}