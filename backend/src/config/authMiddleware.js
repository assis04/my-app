import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function authMiddleware(req, res, next) {
  // Prioridade: cookie httpOnly > Authorization header (fallback p/ clientes legados)
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

    // Rejeitar refresh tokens usados como access tokens
    if (decoded.refresh === true) {
      return res.status(401).json({ message: 'Token inválido: refresh token não pode ser usado como access token.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}