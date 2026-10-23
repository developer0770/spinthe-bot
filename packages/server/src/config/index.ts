import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Загружаем .env из корня проекта (на 3 уровня выше от dist/src/config
// или из cwd, если запускается через tsx)
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),       // dist/src/config -> dist
  path.resolve(__dirname, '../../../.env'),    // dist/src/config -> project root
  path.resolve(__dirname, '../../../../.env'), // запасной
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function required(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || process.env.SERVER_PORT || '3000', 10),

  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    url: required(
      'DATABASE_URL',
      'postgresql://spinthe:spinthe_secret@localhost:5432/spinthe?schema=public',
    ),
  },

  redis: {
    url: required('REDIS_URL', 'redis://localhost:6379'),
  },

  telegram: {
    botToken: process.env.BOT_TOKEN || '',
    webAppUrl: process.env.WEBAPP_URL || 'http://localhost:5173',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  webAppUrl: process.env.WEBAPP_URL || '*',
};

if (config.isProd) {
  const requiredProductionVars = [
    'BOT_TOKEN',
    'JWT_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
    'WEBAPP_URL',
    'CORS_ORIGIN',
  ];

  for (const key of requiredProductionVars) {
    if (!process.env[key]?.trim()) {
      throw new Error(`[config] ${key} is required in production`);
    }
  }

  if (process.env.JWT_SECRET === 'dev-secret-change-me') {
    throw new Error('[config] Default JWT_SECRET is forbidden in production');
  }

  if (process.env.CORS_ORIGIN?.trim() === '*') {
    throw new Error('[config] Wildcard CORS_ORIGIN is forbidden in production');
  }

  if (!process.env.WEBAPP_URL?.startsWith('https://')) {
    throw new Error('[config] WEBAPP_URL must use HTTPS in production');
  }
}