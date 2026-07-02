'use client';

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
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
