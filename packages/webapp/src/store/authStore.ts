import { create } from 'zustand';
import { UserDTO } from '@spinthe/shared';
import { loginWithTelegram, logout as clearAuth, getStoredUser } from '../api/auth';

type AuthStatus = 'idle' | 'loading' | 'authed' | 'error';

interface AuthState {
  status: AuthStatus;
  user: UserDTO | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
  setUser: (u: UserDTO | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: getStoredUser(),
  error: null,

  login: async () => {
    set({ status: 'loading', error: null });
    try {
      const { user } = await loginWithTelegram();
      set({ status: 'authed', user, error: null });
    } catch (e: any) {
      set({
        status: 'error',
        error: e?.message || 'Ошибка авторизации',
      });
    }
  },

  logout: () => {
    clearAuth();
    set({ status: 'idle', user: null });
  },

  setUser: (user) => set({ user, status: user ? 'authed' : 'idle' }),
}));
