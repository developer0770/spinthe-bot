import { prisma } from '../../db/prisma';
import { spendHearts, addHeartsWithXp, addXp } from '../economy/economy.service';
import { getIO } from '../../ws';
import { redis, RKEY } from '../../db/redis';

/**
 * Пакеты сердечек за Telegram Stars ⭐ (реальная покупка через TG Invoice).
 * Звёзды не конвертируются в реальные деньги в dev-режиме — просто начисляем сердца.
 */
export const HEART_PACKS = [
  { id: 'hearts_50', stars: 15, hearts: 50, bonus: 0, label: '50 ❤️' },
  { id: 'hearts_250', stars: 65, hearts: 250, bonus: 25, label: '250 ❤️ +25' },
  { id: 'hearts_500', stars: 120, hearts: 500, bonus: 75, label: '500 ❤️ +75' },
  { id: 'hearts_1200', stars: 250, hearts: 1200, bonus: 300, label: '1200 ❤️ +300' },
  { id: 'hearts_3125', stars: 600, hearts: 3125, bonus: 900, label: '3125 ❤️ +900', best: true },
  { id: 'hearts_7000', stars: 1200, hearts: 7000, bonus: 3000, label: '7000 ❤️ +3000' },
];

/**
 * Активировать покупку пакета сердечек (в dev-режиме сразу начисляет, в проде — после подтверждения TG Invoice).
 */
export async function buyHeartsPack(userId: number, packId: string): Promise<{ hearts: number }> {
  const pack = HEART_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error('pack_not_found');
  const total = pack.hearts + pack.bonus;
  const u = await prisma.user.update({
    where: { id: userId },
    data: { heartsBalance: { increment: total } },
    select: { heartsBalance: true },
  });
  await addXp(userId, 20);
  pushBalance(userId, { hearts: u.heartsBalance });
  return { hearts: total };
}

/**
 * Купить VIP на 30 дней за 500 сердечек (внутренняя покупка) или за Stars.
 */
export async function buyVip(userId: number, days = 30): Promise<{ until: Date }> {
  const cost = days === 7 ? 150 : days === 30 ? 500 : days === 365 ? 5000 : 500;
  const ok = await spendHearts(userId, cost);
  if (!ok) throw new Error('not_enough_hearts');
  const now = new Date();
  const existing = (await prisma.user.findUnique({ where: { id: userId } }))?.vipUntil;
  const base = existing && existing > now ? existing : now;
  const until = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { isVip: true, vipUntil: until } });
  return { until };
}

/**
 * Подарить подарок другому игроку (списывается heartsBalance + начисляется XP + gift instance создаётся).
 */
export async function sendGift(
  fromId: number,
  toId: number,
  giftId: string,
  tableId?: number,
): Promise<{ hearts: number; giftName: string; giftEmoji: string }> {
  if (fromId === toId) throw new Error('self_gift');
  const gift = await prisma.giftCatalog.findUnique({ where: { id: giftId } });
  if (!gift || !gift.isActive) throw new Error('gift_not_found');

  const from = await prisma.user.findUnique({ where: { id: fromId } });
  const isVip = !!(from?.isVip && from.vipUntil && new Date(from.vipUntil) > new Date());
  let price = gift.priceHearts;
  if (isVip) price = Math.max(1, Math.floor(price * 0.8)); // VIP скидка 20%

  const ok = await spendHearts(fromId, price);
  if (!ok) throw new Error('not_enough_hearts');
  await prisma.giftInstance.create({
    data: {
      giftId,
      fromUserId: fromId,
      toUserId: toId,
      tableId,
      pricePaid: price,
    },
  });
  await addHeartsWithXp(toId, Math.floor(price / 2), 'gift_received');
  await addXp(fromId, 5);
  const hearts = (await prisma.user.findUnique({ where: { id: fromId }, select: { heartsBalance: true } }))?.heartsBalance ?? 0;
  const fromUser = await prisma.user.findUnique({ where: { id: fromId }, select: { name: true } });
  // Сохраняем уведомление в БД
  const notif = await prisma.notification.create({
    data: {
      userId: toId,
      type: 'gift_received',
      title: `🎁 Подарок от ${fromUser?.name || 'Игрок'}`,
      body: `${gift.emoji} ${gift.name}`,
      payload: { fromId, giftId: gift.id, emoji: gift.emoji },
    },
  });
  const io = getIO();
  const sid = await redis.get(RKEY.userSocket(toId));
  if (sid) {
    io.to(sid).emit('gift:received', {
      fromUser: { id: fromId, name: fromUser?.name || 'Игрок' },
      gift: { id: gift.id, name: gift.name, emoji: gift.emoji },
    } as any);
    io.to(sid).emit('notification:new' as any, {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      payload: notif.payload,
      isRead: false,
      createdAt: notif.createdAt.toISOString(),
    });
  }
  // Если оба за одним столом — бродкаст анимации подарка
  if (tableId) {
    io.to(`table:${tableId}`).emit('gift:animate' as any, {
      fromId, toId, giftId, emoji: gift.emoji, name: gift.name,
    });
  }
  return { hearts, giftName: gift.name, giftEmoji: gift.emoji };
}

/**
 * Инвентарь пользователя: собственные бутылочки, рамки, бустеры.
 */
export async function getInventory(userId: number) {
  const [bottles, frames, boosters] = await Promise.all([
    prisma.userBottle.findMany({ where: { userId }, include: { bottle: true } }),
    prisma.userFrame.findMany({ where: { userId }, include: { frame: true } }),
    prisma.userBooster.findMany({ where: { userId }, include: { booster: true } }),
  ]);
  type BottleWithBottle = (typeof bottles)[number];
  type FrameWithFrame = (typeof frames)[number];
  type BoosterWithBooster = (typeof boosters)[number];
  return {
    bottles: bottles.map((b: BottleWithBottle) => ({ id: b.bottleId, name: b.bottle.name, imageUrl: b.bottle.imageUrl, acquiredAt: b.acquiredAt })),
    frames: frames.map((f: FrameWithFrame) => ({ id: f.frameId, name: f.frame.name, imageUrl: f.frame.imageUrl, acquiredAt: f.acquiredAt })),
    boosters: boosters.map((b: BoosterWithBooster) => ({ id: b.boosterId, name: b.booster.name, quantity: b.quantity, description: b.booster.description })),
  };
}

/** Список подарков (каталог). */
export async function listGifts() {
  return prisma.giftCatalog.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { priceHearts: 'asc' }] });
}

/** Список скинов-бутылочек для магазина. */
export async function listBottlesShop(userId: number) {
  const all = await prisma.bottleCatalog.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  const owned = new Set(
    (await prisma.userBottle.findMany({ where: { userId }, select: { bottleId: true } })).map((x: { bottleId: string }) => x.bottleId),
  );
  return all.map((b: (typeof all)[number]) => ({ ...b, owned: owned.has(b.id) }));
}

/** Список рамок. Заблокированные (событийные/админские) не показываются в обычном магазине. */
export async function listFramesShop(userId: number) {
  const all = await prisma.frameCatalog.findMany({
    where: { isActive: true, locked: false },
    orderBy: { sortOrder: 'asc' },
  });
  const owned = new Set(
    (await prisma.userFrame.findMany({ where: { userId }, select: { frameId: true } })).map((x: { frameId: string }) => x.frameId),
  );
  return all.map((f: (typeof all)[number]) => ({ ...f, owned: owned.has(f.id) }));
}

/** Купить скин бутылочки. */
export async function buyBottle(userId: number, bottleId: string) {
  const b = await prisma.bottleCatalog.findUnique({ where: { id: bottleId } });
  if (!b) throw new Error('not_found');
  if (b.priceHearts == null) throw new Error('free_item');
  const exists = await prisma.userBottle.findUnique({ where: { userId_bottleId: { userId, bottleId } } });
  if (exists) throw new Error('already_owned');
  const ok = await spendHearts(userId, b.priceHearts);
  if (!ok) throw new Error('not_enough_hearts');
  await prisma.userBottle.create({ data: { userId, bottleId } });
  return { ok: true };
}

/** Купить рамку. */
export async function buyFrame(userId: number, frameId: string) {
  const f = await prisma.frameCatalog.findUnique({ where: { id: frameId } });
  if (!f || !f.isActive) throw new Error('not_found');
  if (f.locked) throw new Error('item_locked');
  if (f.priceHearts == null) throw new Error('free_item');
  const exists = await prisma.userFrame.findUnique({ where: { userId_frameId: { userId, frameId } } });
  if (exists) throw new Error('already_owned');
  const ok = await spendHearts(userId, f.priceHearts);
  if (!ok) throw new Error('not_enough_hearts');
  await prisma.userFrame.create({ data: { userId, frameId } });
  return { ok: true };
}

/** Экипировать скин бутылочки. */
export async function equipBottle(userId: number, bottleId: string) {
  const owned = await prisma.userBottle.findUnique({ where: { userId_bottleId: { userId, bottleId } } });
  if (!owned && bottleId !== 'classic_green') throw new Error('not_owned');
  await prisma.user.update({ where: { id: userId }, data: { activeBottleId: bottleId } });
}

/** Экипировать рамку. */
export async function equipFrame(userId: number, frameId: string | null) {
  if (frameId) {
    const owned = await prisma.userFrame.findUnique({ where: { userId_frameId: { userId, frameId } } });
    if (!owned) throw new Error('not_owned');
  }
  await prisma.user.update({ where: { id: userId }, data: { activeFrameId: frameId } });
}

function pushBalance(userId: number, balance: { hearts: number }) {
  const io = getIO();
  redis.get(RKEY.userSocket(userId)).then((sid) => {
    if (sid) io.to(sid).emit('user:balance_changed', { hearts: balance.hearts, delta: 0, reason: 'purchase' });
  });
}
