import { prisma } from '../../db/prisma';

/**
 * Формула опыта до следующего уровня.
 * Уровень N требует N*100 XP. Линейный рост для простоты.
 */
export function xpForLevel(level: number): number {
  return level * 100;
}

/** Пересчитать уровень по XP: возвращает {level, current, needed}. */
export function levelFromXp(xp: number): { level: number; progressXp: number; neededXp: number } {
  let level = 1;
  let acc = 0;
  while (true) {
    const need = xpForLevel(level);
    if (xp < acc + need) {
      return { level, progressXp: xp - acc, neededXp: need };
    }
    acc += need;
    level++;
    if (level > 1000) break; // safeguard
  }
  return { level, progressXp: 0, neededXp: xpForLevel(level) };
}

/** Начислить XP, обновить уровень, вернуть новый уровень и был ли level-up. */
export async function addXp(userId: number, delta: number): Promise<{ newLevel: number; leveledUp: boolean; addedXp: number }> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: delta } },
    select: { xp: true, level: true },
  });
  const { level } = levelFromXp(u.xp);
  const leveledUp = level > u.level;
  if (leveledUp) {
    await prisma.user.update({ where: { id: userId }, data: { level } });
    // Начисляем бонус за уровень: +50 сердечек за каждый новый уровень
    await prisma.user.update({
      where: { id: userId },
      data: { heartsBalance: { increment: 50 } },
    });
  }
  return { newLevel: level, leveledUp, addedXp: delta };
}

/** Начислить сердечки (с триггером XP: 1 XP за сердечко). */
export async function addHeartsWithXp(userId: number, hearts: number, _reason: string): Promise<{ hearts: number; newLevel: number; leveledUp: boolean }> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { heartsBalance: { increment: hearts } },
    select: { heartsBalance: true },
  });
  const xpRes = await addXp(userId, Math.max(1, Math.floor(hearts / 2)));
  return { hearts: u.heartsBalance, newLevel: xpRes.newLevel, leveledUp: xpRes.leveledUp };
}

/** Списать сердечки (с проверкой баланса). */
export async function spendHearts(userId: number, amount: number): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.findUnique({ where: { id: userId }, select: { heartsBalance: true } });
      if (!u || u.heartsBalance < amount) throw new Error('insufficient');
      await tx.user.update({ where: { id: userId }, data: { heartsBalance: { decrement: amount } } });
    });
    return true;
  } catch {
    return false;
  }
}

/** Дейли награда: раз в 24ч. Награда растёт с уровнем. */
export interface DailyReward {
  hearts: number;
  coins: number;
  gems: number;
  streak: number;
  nextAvailableAt: Date;
}

export async function claimDaily(userId: number): Promise<DailyReward | null> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  const now = new Date();
  if (u.lastDailyAt) {
    const since = now.getTime() - u.lastDailyAt.getTime();
    if (since < 20 * 60 * 60 * 1000) return null; // раз в ~20ч чтобы не терять стрик
  }
  // Базовая награда: 50 сердечек, +5 за уровень
  const lvl = u.level || 1;
  const isVip = !!u.isVip && u.vipUntil && new Date(u.vipUntil) > now;
  let hearts = 50 + lvl * 5;
  let coins = 10;
  let gems = lvl % 5 === 0 ? 1 : 0;
  // VIP бонус: +100 сердечек, x2 монеты, удвоенный шанс алмаза
  if (isVip) {
    hearts += 100;
    coins *= 2;
    if (lvl % 5 !== 0 && Math.random() < 0.2) gems += 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      heartsBalance: { increment: hearts },
      coinsBalance: { increment: coins },
      gemsBalance: { increment: gems },
      lastDailyAt: now,
    },
  });
  await addXp(userId, 10);

  return {
    hearts,
    coins,
    gems,
    streak: 0, // упрощённо
    nextAvailableAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
  };
}

export function canClaimDaily(lastDailyAt: Date | null): boolean {
  if (!lastDailyAt) return true;
  return Date.now() - lastDailyAt.getTime() >= 20 * 60 * 60 * 1000;
}

/** Время до следующей дейли-награды в мс. */
export function msUntilNextDaily(lastDailyAt: Date | null): number {
  if (!lastDailyAt) return 0;
  return Math.max(0, 20 * 60 * 60 * 1000 - (Date.now() - lastDailyAt.getTime()));
}
