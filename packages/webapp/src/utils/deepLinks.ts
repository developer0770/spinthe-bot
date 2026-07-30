import { getStartParam } from './telegram';

const PENDING_INVITE_KEY = 'spinthe:pending_invite';

/**
 * Разбирает startapp-параметр на старте приложения.
 * Поддерживаемые форматы:
 *  - room_XXXXXX — пригласительный код комнаты (из ссылки t.me/bot?startapp=room_ABC123)
 *  - r_XXXXXX    — короткая форма
 */
export function consumePendingInvite(): string | null {
  // Сначала проверяем сохранённый (из прошлой сессии, если авторизация завершилась позже)
  const saved = sessionStorage.getItem(PENDING_INVITE_KEY);
  if (saved) {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    return saved;
  }

  try {
    const param = getStartParam();
    if (!param) return null;
    const lower = param.toLowerCase().trim();
    let code: string | null = null;
    if (lower.startsWith('room_')) code = param.slice(5);
    else if (lower.startsWith('r_')) code = param.slice(2);

    if (code && /^[A-Za-z0-9_-]{3,16}$/.test(code)) {
      return code;
    }
  } catch {}
  return null;
}

/** Сохраняет инвайт-код, чтобы применить его после логина/онбординга. */
export function stashPendingInvite(code: string) {
  try { sessionStorage.setItem(PENDING_INVITE_KEY, code); } catch {}
}
