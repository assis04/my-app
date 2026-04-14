import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './env.js';

/**
 * Parse simples de cookies a partir do header (evita dependência extra).
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [name, ...rest] = pair.trim().split('=');
    if (name) cookies[name.trim()] = decodeURIComponent(rest.join('=').trim());
  });
  return cookies;
}

let io;

const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean);
const localOrigins = env.CORS_LOCAL_ORIGINS ? env.CORS_LOCAL_ORIGINS.split(',').map(o => o.trim()).filter(Boolean) : [];
const allOrigins = [...allowedOrigins, ...localOrigins];

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error('Bloqueado pelo CORS'));
      },
      credentials: true
    }
  });

  // Middleware de autenticação JWT — valida antes de permitir conexão
  io.use((socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie || '');
      const token = cookies.accessToken;

      if (!token) {
        return next(new Error('Autenticação necessária.'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });

      if (decoded.refresh === true) {
        return next(new Error('Token inválido.'));
      }

      socket.user = decoded;
      next();
    } catch {
      next(new Error('Token inválido ou expirado.'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_branch', (branchId) => {
      socket.join(`branch_${branchId}`);
    });

    socket.on('leave_branch', (branchId) => {
      socket.leave(`branch_${branchId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io não foi inicializado.');
  }
  return io;
}

/**
 * Helper to emit a queue update to everyone observing a branch.
 */
export function emitQueueUpdate(branchId) {
  if (io) {
    io.to(`branch_${branchId}`).emit('queue_update', { branchId, timestamp: Date.now() });
  }
}
