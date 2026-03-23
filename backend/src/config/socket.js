import { Server } from 'socket.io';

let io;

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // console.log(`Novo cliente conectado via WebSocket: ${socket.id}`);

    // Cliente avisa que quer escutar eventos de uma filial específica
    socket.on('join_branch', (branchId) => {
      socket.join(`branch_${branchId}`);
      // console.log(`Socket ${socket.id} joined room branch_${branchId}`);
    });

    socket.on('leave_branch', (branchId) => {
      socket.leave(`branch_${branchId}`);
    });

    socket.on('disconnect', () => {
      // console.log(`Cliente desconectado: ${socket.id}`);
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
 * Helper to emit a queue update to everyone observing a branch
 */
export function emitQueueUpdate(branchId) {
  if (io) {
    io.to(`branch_${branchId}`).emit('queue_update', { branchId, timestamp: Date.now() });
  }
}
