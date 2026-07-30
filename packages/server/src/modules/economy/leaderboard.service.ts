import { prisma } from '../../db/prisma';

export type LeaderCategory = 'kisses' | 'gifts' | 'hearts' | 'level' | 'friends';
export type LeaderPeriod = 'day' | 'week' | 'all';

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

const DAY_MS = 24 * 60 * 60 * 1000;

function periodSince(period: LeaderPeriod): Date | null {
  if (period === 'day') return new Date(Date.now() - DAY_MS);
  if (period === 'week') return new Date(Date.now() - 7 * DAY_MS);
  return null;
}

function calcAge(bd: Date | null): number | null {
  if (!bd) return null;
  const d = new Date(bd);
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.floor(age);
}

function toUserDTO(u: {
  id: number;
  name: string;
  avatarUrl: string | null;
  gender: 'male' | 'female' | null;
  birthDate: Date | null;
  level: number;
  isVip: boolean;
}): Omit<LeaderEntry, 'score' | 'rank'> {
  return {
    userId: u.id,
    name: u.name || 'Игрок',
    avatarUrl: u.avatarUrl,
    gender: (u.gender || 'female') as 'male' | 'female',
    age: calcAge(u.birthDate),
    level: u.level || 1,
    isVip: !!u.isVip,
  };
}

/**
 * Лидерборд.
 * - kisses: totalKisses у User (all-time) или количество спинов с choice='kiss' за период (когда period != all).
 * - gifts: количество отправленных подарков (GiftInstance) за период.
 * - hearts: текущий баланс (all-time), либо сумма начислений за период — для MVP используем баланс.
 * - level: уровень (с учётом XP).
 * - friends: количество принятых друзей (union A+B).
 *
 * Для корректного period-filter используется фильтр по createdAt связанных записей.
 */
export async function getLeaderboard(
  category: LeaderCategory,
  period: LeaderPeriod,
  limit = 50,
  myId?: number,
): Promise<{ list: LeaderEntry[]; me?: LeaderEntry }> {
  const since = periodSince(period);

  type ScoreMap = Map<number, number>;
  const scoreMap: ScoreMap = new Map();

  if (category === 'gifts') {
    // Считаем отправленные подарки (fromUserId)
    const where: any = {};
    if (since) where.createdAt = { gte: since };
    const rows = await prisma.giftInstance.groupBy({
      by: ['fromUserId'],
      where,
      _count: { fromUserId: true },
      orderBy: { _count: { fromUserId: 'desc' } },
      take: limit,
    });
    for (const c of rows) scoreMap.set(c.fromUserId, c._count.fromUserId);
  } else if (category === 'friends') {
    // Друзья: union (A→B и B→A) по статусу accepted.
    const rows = await prisma.$queryRaw<{ user_id: bigint; cnt: bigint }[]>`
      SELECT user_id, COUNT(*)::int AS cnt FROM (
        SELECT "userAId" AS user_id FROM "Friendship" WHERE status = 'accepted'
        UNION ALL
        SELECT "userBId" AS user_id FROM "Friendship" WHERE status = 'accepted'
      ) f GROUP BY user_id ORDER BY cnt DESC LIMIT ${Number(limit)}
    `;
    for (const r of rows) scoreMap.set(Number(r.user_id), Number(r.cnt));
  } else if (category === 'kisses' && since) {
    // По спинам за период
    const rows = await prisma.spin.groupBy({
      by: ['spinnerId'],
      where: { choice: 'kiss', createdAt: { gte: since } },
      _count: { spinnerId: true },
      orderBy: { _count: { spinnerId: 'desc' } },
      take: limit,
    });
    for (const c of rows) scoreMap.set(c.spinnerId, c._count.spinnerId);
  }

  let users: Array<{
    id: number; name: string; avatarUrl: string | null; gender: 'male' | 'female' | null;
    birthDate: Date | null; level: number; isVip: boolean; xp: number;
    totalKisses: bigint; heartsBalance: number;
  }>;

  if (category === 'kisses' && !since) {
    users = await prisma.user.findMany({
      orderBy: { totalKisses: 'desc' as const },
      take: limit,
      select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true, level: true, isVip: true, xp: true, totalKisses: true, heartsBalance: true },
    });
  } else if (category === 'hearts') {
    users = await prisma.user.findMany({
      orderBy: { heartsBalance: 'desc' as const },
      take: limit,
      select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true, level: true, isVip: true, xp: true, totalKisses: true, heartsBalance: true },
    });
  } else if (category === 'level') {
    users = await prisma.user.findMany({
      orderBy: [{ level: 'desc' as const }, { xp: 'desc' as const }],
      take: limit,
      select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true, level: true, isVip: true, xp: true, totalKisses: true, heartsBalance: true },
    });
  } else {
    // gifts/friends/kisses-period — по scoreMap
    const ids = Array.from(scoreMap.keys());
    users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true, level: true, isVip: true, xp: true, totalKisses: true, heartsBalance: true },
    });
    // Сохраняем порядок по scoreMap
    users.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));
    users = users.slice(0, limit);
  }

  const getScore = (u: (typeof users)[number]): number => {
    switch (category) {
      case 'kisses':
        if (since) return scoreMap.get(u.id) || 0;
        return Number(u.totalKisses);
      case 'gifts':
      case 'friends':
        return scoreMap.get(u.id) || 0;
      case 'hearts':
        return u.heartsBalance;
      case 'level':
        return u.level * 1_000_000 + u.xp;
    }
  };

  const list: LeaderEntry[] = users
    .filter((u) => !!u)
    .map((u, i) => ({
      ...toUserDTO(u),
      score: getScore(u),
      rank: i + 1,
    }));

  let me: LeaderEntry | undefined;
  if (myId) {
    const me_u = await prisma.user.findUnique({
      where: { id: myId },
      select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true, level: true, isVip: true, xp: true, totalKisses: true, heartsBalance: true },
    });
    if (me_u) {
      let myScore = 0;
      let myRank = 1;
      if (category === 'kisses') {
        myScore = since ? (scoreMap.get(myId) || 0) : Number(me_u.totalKisses);
        myRank = (await prisma.spin.count({
          where: since
            ? { choice: 'kiss', createdAt: { gte: since }, spinner: { isNot: { id: myId } } }
            : { spinner: { totalKisses: { gt: me_u.totalKisses } } },
        })) + 1;
        if (since) {
          // проще: считаем по scoreMap
          const my = scoreMap.get(myId) || 0;
          let higher = 0;
          for (const [, s] of scoreMap) if (s > my) higher++;
          myRank = higher + 1;
        }
      } else if (category === 'hearts') {
        myScore = me_u.heartsBalance;
        myRank = (await prisma.user.count({ where: { heartsBalance: { gt: me_u.heartsBalance } } })) + 1;
      } else if (category === 'level') {
        myScore = me_u.level * 1_000_000 + me_u.xp;
        myRank = (await prisma.user.count({
          where: { OR: [{ level: { gt: me_u.level } }, { level: me_u.level, xp: { gt: me_u.xp } }] },
        })) + 1;
      } else if (category === 'gifts' || category === 'friends') {
        myScore = scoreMap.get(myId) || 0;
        let higher = 0;
        for (const [, s] of scoreMap) if (s > myScore) higher++;
        myRank = higher + 1;
      }
      me = { ...toUserDTO(me_u), score: myScore, rank: myRank };
    }
  }
  return { list, me };
}
