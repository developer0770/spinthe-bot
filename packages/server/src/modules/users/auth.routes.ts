import { Router } from 'express';
import { z } from 'zod';
import { config } from '../../config';
import { findOrCreateTelegramUser } from './users.service';
import { signAccessToken } from '../../auth/jwt';
import { validateAndParseInitData, createDevInitData, ParsedInitData } from '../../auth/telegramAuth';

const router = Router();

const bodySchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

/**
 * Определяет, можно ли использовать dev-fallback для авторизации.
 * Разрешено ТОЛЬКО в development режиме при установленном плейсхолдерном BOT_TOKEN.
 */
function isDevFallbackAllowed(): boolean {
  if (config.nodeEnv !== 'development') return false;
  const token = config.telegram.botToken;
  if (!token) return true;
  // Плейсхолдерные токены из примеров (вида "000000:AAExample...") — включают fallback
  if (token.startsWith('0000000000:') || token.includes('ExampleToken')) return true;
  return false;
}

/**
 * POST /api/auth/telegram
 * Body: { initData: string } — сырая строка window.Telegram.WebApp.initData
 *
 * 1) Валидирует HMAC-подпись initData от Telegram
 * 2) Находит или создаёт пользователя по telegramId
 * 3) Возвращает JWT и профиль пользователя
 */
router.post('/telegram', async (req, res) => {
  const parseResult = bodySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'invalid_body',
      details: parseResult.error.flatten(),
    });
    return;
  }

  const { initData } = parseResult.data;
  let parsed: ParsedInitData | null = validateAndParseInitData(initData);

  // Dev-fallback только в development режиме с невалидным (плейсхолдерным) BOT_TOKEN
  if (!parsed && isDevFallbackAllowed()) {
    console.warn('[auth] initData validation failed, using DEV fallback (safe because BOT_TOKEN is placeholder in dev mode)');
    // Поддержка имён, присланных с клиента в dev-режиме
    try {
      const params = new URLSearchParams(initData);
      const u = params.get('user');
      if (u) {
        const overrides = JSON.parse(u);
        parsed = createDevInitData(overrides);
      } else {
        parsed = createDevInitData();
      }
    } catch {
      parsed = createDevInitData();
    }
  }

  if (!parsed) {
    res.status(401).json({
      error: 'invalid_init_data',
      message: 'Telegram initData signature invalid. Check BOT_TOKEN.',
    });
    return;
  }

  const { user: tgUser } = parsed;
  const { user, isNew } = await findOrCreateTelegramUser({
    id: tgUser.id,
    first_name: tgUser.first_name,
    last_name: tgUser.last_name,
    username: tgUser.username,
    photo_url: tgUser.photo_url,
    language_code: tgUser.language_code,
    is_premium: tgUser.is_premium,
  });

  const token = signAccessToken({ userId: user.id, telegramId: user.telegramId });

  res.json({
    token,
    user,
    isNew,
  });
});

export default router;
