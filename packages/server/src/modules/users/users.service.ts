import { prisma } from '../../db/prisma';
import { Gender, UserDTO, PublicUserDTO } from '@spinthe/shared';

/**
 * Найти существующего пользователя по telegramId или создать нового.
 * Обновляет актуальные данные (username, avatar, lastActive).
 */
export async function findOrCreateTelegramUser(tgUser: {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}): Promise<{ user: UserDTO; isNew: boolean }> {
  const tgId = BigInt(tgUser.id);

  const existing = await prisma.user.findUnique({ where: { telegramId: tgId } });

  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim() || 'Игрок';

  if (!existing) {
    const created = await prisma.user.create({
      data: {
        telegramId: tgId,
        username: tgUser.username || null,
        name,
        avatarUrl: tgUser.photo_url || null,
        languageCode: tgUser.language_code || 'ru',
        isPremium: !!tgUser.is_premium,
        isVip: false,
        heartsBalance: 0,
        tutorialDone: false,
      },
    });
    return { user: toUserDTO(created), isNew: true };
  }

  // Обновляем поля, которые могли измениться в Telegram
  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      username: tgUser.username ?? existing.username,
      avatarUrl: tgUser.photo_url ?? existing.avatarUrl,
      name: existing.name || name,
      languageCode: tgUser.language_code ?? existing.languageCode,
      isPremium: tgUser.is_premium !== undefined ? !!tgUser.is_premium : existing.isPremium,
      lastActiveAt: new Date(),
    },
  });

  return { user: toUserDTO(updated), isNew: false };
}

/** Посчитать возраст по дате рождения */
export function calculateAge(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

/** User -> UserDTO */
export function toUserDTO(u: any): UserDTO {
  return {
    id: u.id,
    telegramId: Number(u.telegramId),
    username: u.username,
    name: u.name,
    avatarUrl: u.avatarUrl,
    birthDate: u.birthDate ? new Date(u.birthDate).toISOString().slice(0, 10) : null,
    age: calculateAge(u.birthDate),
    gender: u.gender,
    isPremium: u.isPremium,
    isVip: !!u.isVip,
    vipUntil: u.vipUntil ? new Date(u.vipUntil).toISOString() : null,
    hearts: u.heartsBalance ?? 0,
    coins: u.coinsBalance ?? 0,
    gems: u.gemsBalance ?? 0,
    xp: u.xp ?? 0,
    level: u.level ?? 1,
    activeBottleId: u.activeBottleId || 'classic_green',
    activeFrameId: u.activeFrameId ?? null,
    kissesCount: Number(u.totalKisses ?? 0),
    tableId: u.tableId ?? null,
    tutorialDone: !!u.tutorialDone,
    soundEnabled: u.soundEnabled !== false,
    musicEnabled: u.musicEnabled !== false,
    role: u.role || 'user',
    isBanned: !!u.isBanned,
  };
}

/** User -> PublicUserDTO (для показа другим игрокам) */
export async function toPublicUserDTO(userId: number): Promise<PublicUserDTO | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  // Последние 3 подарка, которые лежат на аватаре
  const recentGifts = await prisma.giftInstance.findMany({
    where: { toUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { gift: true },
  });
  return {
    id: u.id,
    name: u.name || 'Игрок',
    avatarUrl: u.avatarUrl,
    age: calculateAge(u.birthDate),
    gender: (u.gender as Gender) || 'female',
    kissesCount: Number(u.totalKisses),
    activeGifts: recentGifts.map((g: any) => ({
      giftId: g.giftId,
      fromUserId: g.fromUserId,
      emoji: g.gift.emoji,
    })),
    activeFrameId: u.activeFrameId,
    dotsCount: u.isVip ? 3 : 0,
    isOnline: true,
    isSpinning: false,
    level: u.level || 1,
    isVip: !!u.isVip,
  };
}

/** Получить UserDTO по id */
export async function getUserDTO(userId: number): Promise<UserDTO | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  return toUserDTO(u);
}

/** Обновить настройки профиля */
export async function updateProfile(userId: number, patch: {
  name?: string;
  birthDate?: string;
  gender?: Gender;
  avatarUrl?: string;
}) {
  const data: any = {};
  if (patch.name !== undefined) data.name = patch.name.trim().slice(0, 32);
  if (patch.birthDate !== undefined) data.birthDate = new Date(patch.birthDate);
  if (patch.gender !== undefined) data.gender = patch.gender;
  if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;

  const u = await prisma.user.update({ where: { id: userId }, data });
  return toUserDTO(u);
}

/** Обновить настройки (звук/музыка) */
export async function updateSettings(userId: number, patch: {
  soundEnabled?: boolean;
  musicEnabled?: boolean;
}) {
  return prisma.user.update({ where: { id: userId }, data: patch });
}

/** Начислить/списать сердечки */
export async function changeHearts(userId: number, delta: number, _reason?: string): Promise<number> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { heartsBalance: { increment: delta } },
  });
  return Math.max(0, u.heartsBalance);
}

/** Обёртки для удобства */
export async function addHearts(userId: number, amount: number, reason?: string) {
  return changeHearts(userId, Math.abs(amount), reason);
}
export async function spendHearts(userId: number, amount: number): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { heartsBalance: true },
      });
      if (!u || u.heartsBalance < amount) throw new Error('insufficient');
      await tx.user.update({
        where: { id: userId },
        data: { heartsBalance: { decrement: amount } },
      });
    });
    return true;
  } catch (e: any) {
    if (e.message === 'insufficient') return false;
    throw e;
  }
}

/** Публичный алиас для toPublicUserDTO */
export const getPublicUser = toPublicUserDTO;
