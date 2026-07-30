import { create } from 'zustand';
import type { GiftItem, BottleSkin, FrameItem, Inventory, HeartPack, LeaderEntry } from '../api/shop';
import { useUserStore } from './userStore';
import { useAuthStore } from './authStore';
import { api } from '../api/client';

interface FlyGift {
  id: string;
  emoji: string;
  name: string;
  fromId: number;
  toId: number;
  at: number;
}

interface EconomyState {
  heartPacks: HeartPack[];
  gifts: GiftItem[];
  bottles: BottleSkin[];
  frames: FrameItem[];
  inventory: Inventory | null;
  canClaimDaily: boolean | null;
  dailyTimeLeft: number;
  leaderboard: LeaderEntry[];
  meEntry?: LeaderEntry;
  flyGifts: FlyGift[];
  activeGiftModal: GiftItem | null;
  giftTargetId: number | null;

  setHeartPacks: (h: HeartPack[]) => void;
  setGifts: (g: GiftItem[]) => void;
  setBottles: (b: BottleSkin[]) => void;
  setFrames: (f: FrameItem[]) => void;
  setInventory: (i: Inventory) => void;
  setDaily: (canClaim: boolean, nextInMs: number) => void;
  setLeaderboard: (list: LeaderEntry[], me?: LeaderEntry) => void;
  addFlyGift: (fg: Omit<FlyGift, 'id' | 'at'>) => void;
  removeFlyGift: (id: string) => void;
  openGiftModal: (gift: GiftItem, targetId: number) => void;
  closeGiftModal: () => void;
  incrementOwned: (kind: 'bottle' | 'frame', id: string) => void;
  refreshMe: () => Promise<void>;
}

export const useEconomyStore = create<EconomyState>((set) => ({
  heartPacks: [],
  gifts: [],
  bottles: [],
  frames: [],
  inventory: null,
  canClaimDaily: null,
  dailyTimeLeft: 0,
  leaderboard: [],
  meEntry: undefined,
  flyGifts: [],
  activeGiftModal: null,
  giftTargetId: null,

  setHeartPacks: (heartPacks) => set({ heartPacks }),
  setGifts: (gifts) => set({ gifts }),
  setBottles: (bottles) => set({ bottles }),
  setFrames: (frames) => set({ frames }),
  setInventory: (inventory) => set({ inventory }),
  setDaily: (canClaimDaily, dailyTimeLeft) => set({ canClaimDaily, dailyTimeLeft }),
  setLeaderboard: (list, meEntry) => set({ leaderboard: list, meEntry }),

  addFlyGift: (fg) =>
    set((s) => ({
      flyGifts: [...s.flyGifts, { ...fg, id: `fg-${Date.now()}-${Math.random()}`, at: Date.now() }],
    })),
  removeFlyGift: (id) =>
    set((s) => ({ flyGifts: s.flyGifts.filter((f) => f.id !== id) })),

  openGiftModal: (activeGiftModal, giftTargetId) => set({ activeGiftModal, giftTargetId }),
  closeGiftModal: () => set({ activeGiftModal: null, giftTargetId: null }),

  incrementOwned: (kind, id) =>
    set((s) => {
      if (kind === 'bottle') {
        return { bottles: s.bottles.map((b) => (b.id === id ? { ...b, owned: true } : b)) };
      } else {
        return { frames: s.frames.map((f) => (f.id === id ? { ...f, owned: true } : f)) };
      }
    }),

  refreshMe: async () => {
    try {
      const j = await api<{ ok: true; me: any }>('/shop/me');
      if (j.ok && j.me) {
        useUserStore.getState().setMe(j.me);
        useAuthStore.setState({ user: j.me });
        try { localStorage.setItem('spinthe:user', JSON.stringify(j.me)); } catch {}
      }
    } catch {}
  },
}));
