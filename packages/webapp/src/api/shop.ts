import { api } from './client';

export interface HeartPack {
  id: string;
  stars: number;
  hearts: number;
  bonus: number;
  label: string;
  best?: boolean;
}

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  priceHearts: number;
  isEvent?: boolean;
}

export interface BottleSkin {
  id: string;
  name: string;
  imageUrl: string;
  priceHearts: number | null;
  owned: boolean;
}

export interface FrameItem {
  id: string;
  name: string;
  imageUrl: string;
  priceHearts: number | null;
  owned: boolean;
}

export interface Inventory {
  bottles: { id: string; name: string; imageUrl: string; acquiredAt: string }[];
  frames: { id: string; name: string; imageUrl: string; acquiredAt: string }[];
  boosters: { id: string; name: string; quantity: number; description: string }[];
}

export interface LeaderEntry {
  userId: number;
  name: string;
  avatarUrl: string | null;
  gender: 'male' | 'female';
  age: number | null;
  level: number;
  score: number;
  rank: number;
  isVip: boolean;
}

export const fetchHeartPacks = () =>
  api<{ ok: true; packs: HeartPack[] }>('/shop/packs').then((r) => r.packs);

export const buyHeartsPack = (id: string) =>
  api<{ ok: true; hearts: number }>(`/shop/buy-pack/${id}`, { method: 'POST' });

export const buyVip = (days = 30) =>
  api<{ ok: true; until: string }>('/shop/buy-vip', {
    method: 'POST',
    body: JSON.stringify({ days }),
  });

export const fetchGifts = () =>
  api<{ ok: true; gifts: GiftItem[] }>('/shop/gifts').then((r) => r.gifts);

export const sendGift = (toUserId: number, giftId: string, tableId?: number) =>
  api<{ ok: true; hearts: number; giftName: string; giftEmoji: string }>(
    `/shop/gift/${toUserId}/${giftId}`,
    { method: 'POST', body: JSON.stringify({ tableId }) },
  );

export const fetchBottlesShop = () =>
  api<{ ok: true; bottles: BottleSkin[] }>('/shop/bottles').then((r) => r.bottles);

export const buyBottle = (id: string) =>
  api<{ ok: true }>(`/shop/buy-bottle/${id}`, { method: 'POST' });

export const equipBottle = (id: string) =>
  api<{ ok: true }>(`/shop/equip-bottle/${id}`, { method: 'POST' });

export const fetchFramesShop = () =>
  api<{ ok: true; frames: FrameItem[] }>('/shop/frames').then((r) => r.frames);

export const buyFrame = (id: string) =>
  api<{ ok: true }>(`/shop/buy-frame/${id}`, { method: 'POST' });

export const equipFrame = (id: string) =>
  api<{ ok: true }>(`/shop/equip-frame/${id}`, { method: 'POST' });

export const fetchInventory = () =>
  api<{ ok: true; inventory: Inventory }>('/shop/inventory').then((r) => r.inventory);

export const claimDaily = () =>
  api<{
    ok: true;
    reward: { hearts: number; coins: number; gems: number; streak: number; nextAvailableAt: string };
    me: any;
  }>('/shop/daily/claim', { method: 'POST' });

export const fetchDailyStatus = () =>
  api<{ ok: true; canClaim: boolean; nextInMs: number }>('/shop/daily/status');

export const fetchLeaderboard = (category = 'kisses', period = 'all') =>
  api<{
    ok: true;
    list: LeaderEntry[];
    me?: LeaderEntry;
    category: string;
    period: string;
  }>(`/shop/leaderboard?category=${category}&period=${period}`);
