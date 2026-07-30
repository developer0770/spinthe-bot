import { api, setToken, clearToken } from './client';
import { UserDTO } from '@spinthe/shared';
import { getInitData, isInTelegram } from '../utils/telegram';

export interface AuthResponse {
  token: string;
  user: UserDTO;
  isNew: boolean;
}

/**
 * Авторизоваться через Telegram initData.
 *
 * Алгоритм:
 *  1) получить window.Telegram.WebApp.initData
 *  2) если открыто вне Telegram и dev — передать пустую строку (сервер создаст dev-пользователя)
 *  3) отправить POST /api/auth/telegram
 *  4) сохранить JWT в localStorage
 */
export async function loginWithTelegram(): Promise<AuthResponse> {
  let initData = getInitData();

  if (!initData) {
    if (import.meta.env.DEV) {
      // Dev-режим вне Telegram: просим сервер создать тестового пользователя
      initData = 'user=' + encodeURIComponent(JSON.stringify({
        id: Math.floor(Math.random() * 1e9) + 100000000,
        first_name: 'Dev',
        last_name: 'Player',
        username: 'devplayer' + Math.floor(Math.random() * 1000),
        language_code: 'ru',
      })) + '&auth_date=' + Math.floor(Date.now() / 1000);
    } else {
      throw new Error('Telegram WebApp initData is not available');
    }
  }

  const res = await api<AuthResponse>('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });

  setToken(res.token);
  try { localStorage.setItem('spinthe:user', JSON.stringify(res.user)); } catch {}
  return res;
}

/** Проверить, есть ли сохранённый токен (и вернуть пользователя если есть) */
export function getStoredUser(): UserDTO | null {
  try {
    const raw = localStorage.getItem('spinthe:user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Выйти */
export function logout() {
  clearToken();
}

/** Активно ли приложение в Telegram? */
export function isTg(): boolean {
  return isInTelegram() || import.meta.env.DEV;
}
