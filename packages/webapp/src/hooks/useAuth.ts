import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { initTelegram } from '../utils/telegram';
import { getToken } from '../api/client';

/**
 * Инициализирует Telegram SDK и производит авторизацию при старте.
 * Если токен уже есть в localStorage — сразу помечает статус authed (user подтянется из localStorage).
 * Если нет — вызывает loginWithTelegram() (обмен initData на JWT).
 */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    initTelegram();

    const token = getToken();
    if (token) {
      // Токен есть при прошлой сессии — считаем что авторизованы, пользователь из localStorage
      if (!user) {
        // Попробуем перелогиниться (освежить данные)
        login();
      } else {
        useAuthStore.setState({ status: 'authed' });
      }
    } else {
      // Первый запуск — логинимся
      login();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, user, error, reLogin: login };
}
