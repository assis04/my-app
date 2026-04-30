import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { isTokenBlacklisted } from '../utils/tokenBlacklist.js';

// Throttle de log do fail-open: sob outage prolongado do Redis, sem isso
// cada request gera uma linha. 1 linha por minuto basta pra alertar oncall
// sem poluir o stdout.
const REDIS_FAIL_LOG_INTERVAL_MS = 60_000;
let lastRedisFailLogAt = 0;

function logRedisFailOpen(err) {
  const now = Date.now();
  if (now - lastRedisFailLogAt < REDIS_FAIL_LOG_INTERVAL_MS) return;
  lastRedisFailLogAt = now;
  // Prefixo [SECURITY] facilita grep em logs do Docker / agregadores.
  console.error(
    '[SECURITY] Redis blacklist indisponível — fail-open ativo. Tokens revogados podem ser aceitos:',
    err?.message || err,
  );
}

// Exposto só para testes — permite resetar o throttle entre casos.
export function _resetRedisFailLogThrottleForTests() {
  lastRedisFailLogAt = 0;
}

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
    } catch (err) {
      // Redis indisponível — aceita o token (fail-open para não derrubar o sistema).
      // Loga para que oncall saiba que tokens revogados podem estar sendo aceitos.
      logRedisFailOpen(err);
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}