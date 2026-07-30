import WebApp from '@twa-dev/sdk';

/**
 * Обёртка над @twa-dev/sdk.
 * Все методы безопасно проверяют наличие Telegram.WebApp
 * (в dev-режиме при открытии вне Telegram не падают).
 */

let initialized = false;

/** Инициализация SDK. Вызывается один раз при старте приложения. */
export function initTelegram() {
  if (initialized) return WebApp;
  initialized = true;

  try {
    // Сообщаем Telegram, что приложение готово
    WebApp.ready();
    // Разворачиваем на всю высоту (убираем заголовок вебвью и т.п.)
    WebApp.expand();
    // Отключаем вертикальные свайпы, чтобы не сворачивали приложение
    WebApp.disableVerticalSwipes?.();
    // Цвет шапки под цвет хедера игры
    WebApp.setHeaderColor('#14202e');
    WebApp.setBackgroundColor('#14202e');
  } catch (e) {
    console.warn('[tg] init failed (running outside Telegram?):', e);
  }
  return WebApp;
}

export function getTelegram() {
  return WebApp;
}

/** Запущено ли приложение внутри Telegram? */
export function isInTelegram(): boolean {
  try {
    return !!WebApp.initData && WebApp.platform !== 'unknown';
  } catch {
    return false;
  }
}

/**
 * Сырая строка initData для передачи на бэк (будет проверена HMAC'ом).
 * В dev-режиме вне Telegram возвращает пустую строку.
 */
export function getInitData(): string {
  try {
    return WebApp.initData || '';
  } catch {
    return '';
  }
}

/** Распарсенный пользователь из initDataUnsafe (НЕ ДЛЯ АУТЕНТИФИКАЦИИ, только UX) */
export function getTgUser(): {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
} | null {
  try {
    const u = WebApp.initDataUnsafe?.user;
    return u ?? null;
  } catch {
    return null;
  }
}

/** Вернуть стартовый параметр (из ссылки t.me/...?startapp=XXXX) */
export function getStartParam(): string | null {
  try {
    return WebApp.initDataUnsafe?.start_param ?? null;
  } catch {
    return null;
  }
}

// ===== Haptic Feedback =====
export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') {
  try { WebApp.HapticFeedback?.impactOccurred(style as any); } catch {}
}
export function hapticNotif(type: 'error' | 'success' | 'warning' = 'success') {
  try { WebApp.HapticFeedback?.notificationOccurred(type); } catch {}
}
export function hapticSelect() {
  try { WebApp.HapticFeedback?.selectionChanged(); } catch {}
}

// ===== Навигация =====
export function closeApp() {
  try { WebApp.close(); } catch {}
}

/** Показать нативный Telegram-алерт */
export function tgAlert(msg: string): Promise<void> {
  return new Promise((resolve) => {
    try { WebApp.showAlert(msg, () => resolve()); } catch { resolve(); }
  });
}
/** Показать нативный confirm */
export function tgConfirm(msg: string): Promise<boolean> {
  return new Promise((resolve) => {
    try { WebApp.showConfirm(msg, (ok) => resolve(!!ok)); } catch { resolve(false); }
  });
}

/** Открыть инвойс Telegram Stars */
export function openInvoice(url: string): Promise<'paid' | 'cancelled' | 'failed' | 'pending'> {
  return new Promise((resolve) => {
    try {
      WebApp.openInvoice(url, (status) => resolve(status as any));
    } catch { resolve('failed'); }
  });
}

/** Поделиться в inline-режиме (приглашение в игру) */
export function shareInvite(text: string) {
  try {
    WebApp.switchInlineQuery?.(text, ['users', 'groups']);
  } catch {}
}
