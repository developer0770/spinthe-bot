import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@spinthe/shared';
import { getToken } from '../api/client';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let listenersBound = false;

/**
 * Вернуть (создав при необходимости) singleton сокет.
 * Автоматически подставляет JWT в auth.
 */
export function getSocket(): AppSocket {
  if (socket) return socket;
  const WS_URL = import.meta.env.VITE_WS_URL || '';
  socket = io(WS_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: false,
    auth: (cb: (data: object) => void) => {
      const token = getToken();
      cb({ token: token || '' });
    },
  } as any);
  return socket;
}

/**
 * Обновить токен (например после логина) и переподключиться.
 */
export function reconnectSocket() {
  const s = getSocket();
  (s.auth as any).token = getToken() || '';
  if (s.connected) s.disconnect().connect();
  else s.connect();
}

/**
 * Подключить сокет если ещё не подключён.
 */
export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    listenersBound = false;
  }
}

export function isListenersBound() {
  return listenersBound;
}
export function markListenersBound() {
  listenersBound = true;
}
