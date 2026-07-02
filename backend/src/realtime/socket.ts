import { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { env } from '../config/env';

let io: IOServer | null = null;

/** Initialise Socket.IO on the given HTTP server. */
export function initSocket(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.on('connection', (socket) => {
    // Clients join a room per poll to receive that poll's live updates.
    socket.on('poll:join', (pollId: string) => {
      if (typeof pollId === 'string') socket.join(`poll:${pollId}`);
    });
    socket.on('poll:leave', (pollId: string) => {
      if (typeof pollId === 'string') socket.leave(`poll:${pollId}`);
    });
    // Per-user room for personal notifications.
    socket.on('user:join', (userId: string) => {
      if (typeof userId === 'string') socket.join(`user:${userId}`);
    });
  });

  return io;
}

export function getIo(): IOServer {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

/** Broadcast updated results to everyone watching a poll. */
export function emitPollResults(pollId: string, payload: unknown): void {
  io?.to(`poll:${pollId}`).emit('poll:results', payload);
}

/** Push a notification to a specific user. */
export function emitNotification(userId: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit('notification', payload);
}
