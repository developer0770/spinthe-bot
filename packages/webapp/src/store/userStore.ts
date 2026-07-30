import { create } from 'zustand';
import type { UserDTO } from '@spinthe/shared';

interface UserState {
  me: UserDTO | null;
  setMe: (u: UserDTO | null) => void;
  patchMe: (p: Partial<UserDTO>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  me: null,
  setMe: (me) => set({ me }),
  patchMe: (patch) => set((s) => ({ me: s.me ? { ...s.me, ...patch } : null })),
}));
