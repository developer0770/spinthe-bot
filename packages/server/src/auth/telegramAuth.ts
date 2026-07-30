import * as crypto from 'crypto';
import { config } from '../config';

/**
 * Результат парсинга initData Telegram WebApp.
 */
export interface ParsedInitData {
  /** все сырые key=value из initData */
  params: Record<string, string>;
  /** распарсенный user */
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
    allows_write_to_pm?: boolean;
  };
  /** строка auth_date в секундах */
  authDate: number;
  /** id чата (если запущено из чата) */
  chatInstance?: string;
  chatType?: string;
  startParam?: string;
}

/**
 * Валидирует initData, присланный от Telegram WebApp, по оф. алгоритму:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Алгоритм:
 *  1) Отсортировать все поля (кроме hash) по алфавиту
 *  2) Склеить как "key=value\nkey=value..." — data_check_string
 *  3) secret_key = HMAC-SHA256(bot_token, "WebAppData")
 *  4) computed_hash = HMAC-SHA256(data_check_string, secret_key) в hex
 *  5) сравнить computed_hash с hash из initData (constant-time compare)
 *  6) проверить что auth_date не старше 24 часов (опционально)
 */
export function validateAndParseInitData(initData: string): ParsedInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    // Сортировка пар key=value по алфавиту
    const pairs: [string, string][] = [];
    for (const [k, v] of params.entries()) pairs.push([k, v]);
    pairs.sort(([a], [b]) => a.localeCompare(b));

    const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegram.botToken)
      .digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Constant-time compare
    if (!safeEqual(computedHash, hash)) {
      console.warn('[auth] initData hash mismatch');
      return null;
    }

    // Проверка давности (24 часа)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    const MAX_AGE = 86400; // 1 день
    if (!authDate || Math.abs(now - authDate) > MAX_AGE) {
      // В dev разрешаем старые данные; в проде — строго
      if (config.nodeEnv === 'production') {
        console.warn('[auth] initData expired');
        return null;
      }
    }

    // Распарсить user
    const userRaw = params.get('user');
    if (!userRaw) return null;
    let user: ParsedInitData['user'];
    try {
      user = JSON.parse(userRaw);
    } catch {
      return null;
    }
    if (!user?.id) return null;

    return {
      params: Object.fromEntries(pairs),
      user,
      authDate,
      chatInstance: params.get('chat_instance') || undefined,
      chatType: params.get('chat_type') || undefined,
      startParam: params.get('start_param') || undefined,
    };
  } catch (e) {
    console.error('[auth] validate failed:', e);
    return null;
  }
}

/**
 * Constant-time сравнение строк для защиты от timing-атак.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Dev-режим: создать фейковый initData для локальной разработки без Telegram.
 * НЕ ИСПОЛЬЗОВАТЬ В ПРОДАКШЕНЕ!
 */
export function createDevInitData(overrides: Partial<ParsedInitData['user']> = {}): ParsedInitData {
  const user = {
    id: 999999999,
    first_name: 'Dev',
    last_name: 'User',
    username: 'devuser',
    language_code: 'ru',
    ...overrides,
  };
  return {
    params: { user: JSON.stringify(user), auth_date: String(Math.floor(Date.now() / 1000)) },
    user,
    authDate: Math.floor(Date.now() / 1000),
  };
}
