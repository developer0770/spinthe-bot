import { config } from '../src/config';
import Redis from 'ioredis';

const redisUrl = config.redis.url;
const isTls = redisUrl.startsWith('rediss://');

console.log(`[test-redis] Режим TLS: ${isTls ? 'ВКЛЮЧЕН (rediss://)' : 'ВЫКЛЮЧЕН'}`);

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  enableReadyCheck: true,
  lazyConnect: true,
  ...(isTls ? { tls: { rejectUnauthorized: true } } : {}),
});

async function run() {
  try {
    console.log('[test-redis] Попытка соединения...');
    await redis.connect();
    console.log('[test-redis] Успешное соединение с Redis!');
    const pingRes = await redis.ping();
    console.log(`[test-redis] Ответ на PING: ${pingRes}`);
    await redis.set('test:connection', 'ok', 'EX', 10);
    const getRes = await redis.get('test:connection');
    console.log(`[test-redis] Тест записи/чтения: ${getRes === 'ok' ? 'УСПЕШНО ✓' : 'ОШИБКА'}`);
    await redis.del('test:connection');
    await redis.quit();
    console.log('[test-redis] Соединение корректно закрыто.');
    process.exit(0);
  } catch (err: any) {
    console.error('[test-redis] Ошибка подключения:', err.message);
    try { redis.disconnect(); } catch {}
    process.exit(1);
  }
}

run();
