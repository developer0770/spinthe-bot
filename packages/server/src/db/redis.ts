import Redis from 'ioredis';
import { config } from '../config';

/**
 * Клиент Redis. Используется для:
 * - presence (онлайн игроки за столом)
 * - блокировок вращения
 * - pub/sub для broadcasting
 * - кэша state стола
 * - rate limiting
 * - индикатора "печатает…"
 */
const isTls = config.redis.url.startsWith('rediss://');

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  ...(isTls ? { tls: { rejectUnauthorized: true } } : {}),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on('connect', () => console.log('[redis] connected'));
redis.on('ready', () => console.log('[redis] ready'));
redis.on('error', (err: Error) => console.error('[redis] error:', err.message));
redis.on('close', () => console.warn('[redis] connection closed'));
redis.on('reconnecting', (ms: number) => console.log(`[redis] reconnecting in ${ms}ms...`));

// Корректное завершение соединения при остановке сервера
const gracefulShutdown = async () => {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('beforeExit', gracefulShutdown);

// Вспомогательные ключи
export const RKEY = {
  userTable: (userId: number) => `user:${userId}:table`,
  userSocket: (userId: number) => `user:${userId}:socket`,
  tablePlayers: (tableId: number) => `table:${tableId}:players`,
  tableGame: (tableId: number) => `table:${tableId}:game`,
  tableTyping: (tableId: number) => `table:${tableId}:typing`,
  spinLock: (tableId: number) => `spin:${tableId}:lock`,
};
