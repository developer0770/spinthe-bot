import { prisma } from '../../db/prisma';
import { redis, RKEY } from '../../db/redis';
import { getIO } from '../../ws';
import { toPublicUserDTO } from '../users/users.service';

export interface FriendDTO {
  userId: number;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  gender: 'male' | 'female';
  status: 'friend' | 'pending_outgoing' | 'pending_incoming' | 'blocked';
  online: boolean;
  lastMessage?: string;
  unreadCount?: number;
}

/** Список друзей/заявок. */
export async function listFriends(userId: number): Promise<FriendDTO[]> {
  const sent = await prisma.friendship.findMany({
    where: { userAId: userId },
    include: { userB: true },
  });
  const received = await prisma.friendship.findMany({
    where: { userBId: userId },
    include: { userA: true },
  });
  const out: FriendDTO[] = [];
  type SentRow = typeof sent[number];
  for (const s of sent as SentRow[]) {
    const pub = await toPublicUserDTO(s.userBId);
    const sid = await redis.get(RKEY.userSocket(s.userBId));
    out.push({
      userId: s.userBId,
      name: pub?.name || s.userB.name,
      avatarUrl: pub?.avatarUrl || s.userB.avatarUrl,
      age: pub?.age ?? null,
      gender: (pub?.gender || 'female') as 'male' | 'female',
      status: s.status === 'accepted' ? 'friend' : s.status === 'blocked' ? 'blocked' : 'pending_outgoing',
      online: !!sid,
    });
  }
  for (const r of received) {
    // Если есть встречная запись — она уже учтена выше как A→B, B→A не дублируем.
    if (sent.find((s: { userBId: number }) => s.userBId === r.userAId)) continue;
    const pub = await toPublicUserDTO(r.userAId);
    const sid = await redis.get(RKEY.userSocket(r.userAId));
    out.push({
      userId: r.userAId,
      name: pub?.name || r.userA.name,
      avatarUrl: pub?.avatarUrl || r.userA.avatarUrl,
      age: pub?.age ?? null,
      gender: (pub?.gender || 'female') as 'male' | 'female',
      status: r.status === 'pending' ? 'pending_incoming' : r.status === 'accepted' ? 'friend' : (r.status as any),
      online: !!sid,
    });
  }
  return out;
}

/** Отправить заявку в друзья. */
export async function sendFriendRequest(fromId: number, toId: number): Promise<void> {
  if (fromId === toId) throw new Error('Нельзя добавить себя');
  // Проверка существующей связи
  const ex1 = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: fromId, userBId: toId } },
  });
  const ex2 = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: toId, userBId: fromId } },
  });
  if (ex1 || ex2) {
    // Если входящая заявка — сразу принимаем
    if (ex2?.status === 'pending') {
      await acceptFriendRequest(fromId, toId);
      return;
    }
    throw new Error('Заявка уже существует');
  }
  await prisma.friendship.create({
    data: { userAId: fromId, userBId: toId, status: 'pending' },
  });
  await notifyUser(toId, {
    type: 'friend_request',
    title: 'Новая заявка в друзья',
    body: 'Кто-то хочет добавить тебя в друзья',
    payload: { fromId },
  });
  pushToUser(toId, 'friend:request', { fromId });
}

/** Принять заявку. */
export async function acceptFriendRequest(userId: number, fromId: number): Promise<void> {
  // Ищем запись где fromId -> userId
  const f = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: fromId, userBId: userId } },
  });
  if (!f || f.status !== 'pending') throw new Error('Заявка не найдена');
  await prisma.friendship.update({ where: { id: f.id }, data: { status: 'accepted' } });
  await notifyUser(fromId, {
    type: 'friend_accepted',
    title: 'Заявка принята!',
    body: 'Теперь вы друзья 💞',
    payload: { userId },
  });
  pushToUser(fromId, 'friend:accepted', { userId });
}

/** Отклонить/удалить из друзей. */
export async function removeFriend(userId: number, otherId: number): Promise<void> {
  const f1 = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: userId, userBId: otherId } },
  });
  const f2 = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: otherId, userBId: userId } },
  });
  if (f1) await prisma.friendship.delete({ where: { id: f1.id } });
  if (f2) await prisma.friendship.delete({ where: { id: f2.id } });
}

/** Заблокировать. */
export async function blockUser(userId: number, otherId: number): Promise<void> {
  let f = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: userId, userBId: otherId } },
  });
  if (!f) {
    f = await prisma.friendship.create({
      data: { userAId: userId, userBId: otherId, status: 'blocked' },
    });
  } else {
    await prisma.friendship.update({ where: { id: f.id }, data: { status: 'blocked' } });
  }
}

// ---------- Notifications & push helpers ----------

export async function notifyUser(
  userId: number,
  n: { type: string; title: string; body?: string; payload?: any },
) {
  const created = await prisma.notification.create({
    data: { userId, type: n.type, title: n.title, body: n.body, payload: n.payload || {} },
  });
  pushToUser(userId, 'notification:new', {
    id: created.id,
    type: created.type,
    title: created.title,
    body: created.body,
    payload: created.payload,
    createdAt: created.createdAt.toISOString(),
  });
}

export async function listNotifications(userId: number) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function markNotificationsRead(userId: number) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

function pushToUser(userId: number, event: string, payload: any) {
  const io = getIO();
  redis.get(RKEY.userSocket(userId)).then((sid) => {
    if (sid) io.to(sid).emit(event as any, payload);
  });
}
