import * as crypto from 'crypto';

/**
 * Валидация initData от Telegram WebApp согласно оф. документации.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 */
export function validateTelegramInitData(initData: string, botToken: string): Record<string, string> | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');

    const dataCheckArr: string[] = [];
    params.sort();
    for (const [key, value] of params.entries()) {
      dataCheckArr.push(`${key}=${value}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  } catch {
    return null;
  }
}

export function parseTelegramUser(userJson: string): {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
} | null {
  try {
    return JSON.parse(decodeURIComponent(userJson));
  } catch {
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }
}
