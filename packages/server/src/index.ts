import express from 'express';
import cors from 'cors';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { prisma } from './db/prisma';
import './db/redis'; // подключаемся к Redis при старте
import { initWebSocket } from './ws';

import authRoutes from './modules/users/auth.routes';
import usersRoutes from './modules/users/users.routes';
import roomsRoutes from './modules/rooms/rooms.routes';
import friendsRoutes from './modules/friends/friends.routes';
import dmRoutes from './modules/chat/dm.routes';
import shopRoutes from './modules/shop/shop.routes';
import adminRoutes from './modules/admin/admin.routes';

async function bootstrap() {
  const app = express();
  
  // 💡 Доверяем прокси Render для корректной работы express-rate-limit
  app.set('trust proxy', 1);

  const server = http.createServer(app);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Middlewares
  app.use(
    cors({
      origin: config.cors.origin === '*' ? true : config.cors.origin.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too_many_requests' },
  });
  app.use('/api/', apiLimiter);

  // Строже для аутентификации
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'too_many_requests' },
  });
  app.use('/api/auth/', authLimiter);

  // Request logger в dev
  if (!config.isProd) {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime(), env: config.nodeEnv });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api/friends', friendsRoutes);
  app.use('/api/dm', dmRoutes);
  app.use('/api/shop', shopRoutes);
  app.use('/api/leaderboard', shopRoutes); // алиас для leaderboard
  app.use('/api/economy', shopRoutes);    // алиас для daily/inventory
  app.use('/api/admin', adminRoutes);

  // 404 для /api/*
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  // Инициализируем WebSocket
  initWebSocket(server);

  // Проверяем подключение к БД
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[db] connected');
  } catch (e) {
    console.error('[db] connection failed:', (e as Error).message);
    console.warn('[db] Убедитесь, что PostgreSQL запущен (docker compose up -d postgres)');
  }

  server.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
    console.log(`[server] env: ${config.nodeEnv}`);
    console.log(`[server] botToken: ${config.telegram.botToken ? 'configured ✓' : '⚠️  НЕ ЗАДАН (dev-mode fallback)'}`);
  });
}

bootstrap().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});