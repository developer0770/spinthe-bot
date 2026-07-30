export type Gender = 'male' | 'female';
export type UserRole = 'user' | 'moderator' | 'admin';

export interface UserDTO {
  id: number;
  telegramId: number;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  birthDate: string | null;
  age: number | null;
  gender: Gender | null;
  isPremium: boolean;
  isVip: boolean;
  vipUntil?: string | null;
  hearts: number;
  coins: number;
  gems: number;
  xp: number;
  level: number;
  activeBottleId: string;
  activeFrameId: string | null;
  kissesCount: number;
  tableId: number | null;
  tutorialDone: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  role: UserRole;
  isBanned?: boolean;
  canClaimDaily?: boolean;
}

export interface PublicUserDTO {
  id: number;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  gender: Gender;
  kissesCount: number;
  activeGifts: GiftInstanceDTO[];
  activeFrameId: string | null;
  dotsCount: number;
  isOnline: boolean;
  isSpinning: boolean;
  level?: number;
  isVip?: boolean;
}

export interface GiftInstanceDTO {
  giftId: string;
  fromUserId: number;
  emoji: string;
}
