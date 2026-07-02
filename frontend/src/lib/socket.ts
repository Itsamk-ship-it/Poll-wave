'use client';

import { io, Socket } from 'socket.io-client';

// `??` so an empty NEXT_PUBLIC_WS_URL means "connect same-origin". The
// Socket.IO endpoint is served under `/api/socket.io` so the WebSocket rides
// the same `/api` route to the backend pod (the default `/socket.io` would be
// routed to the frontend pod). Local dev falls back to the :4000 API.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL || undefined, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socket;
}

export function joinPoll(pollId: string) {
  getSocket().emit('poll:join', pollId);
}
export function leavePoll(pollId: string) {
  getSocket().emit('poll:leave', pollId);
}
export function joinUser(userId: string) {
  getSocket().emit('user:join', userId);
}
