import { prisma } from '../../db/prisma';
import { redis, RKEY } from '../../db/redis';
import { getIO } from '../../ws';
import { notifyUser } from '../friends/friends.service';

export interface DMMessageDTO {
  id: number;
  fromId: number;
  toId: number;
  text: string;
  type: 'text' | 'sticker';
  stickerId?: string | null;
  createdAt: string;
}

export const STICKERS = [
  { id: 'kiss1', emoji: '💋', name: 'Поцелуй' },
  { id: 'heart1', emoji: '❤️', name: 'Сердце' },
  { id: 'rose', emoji: '🌹', name: 'Роза' },
  { id: 'fire', emoji: '🔥', name: 'Огонь' },
  { id: 'wink', emoji: '😉', name: 'Подмигивание' },
  { id: 'blush', emoji: '😳', name: 'Смущение' },
  { id: 'laugh', emoji: '😂', name: 'Смех' },
  { id: 'cool', emoji: '😎', name: 'Круто' },
  { id: 'cry', emoji: '😢', name: 'Грусть' },
  { id: 'wave', emoji: '👋', name: 'Привет' },
  { id: 'cocktail', emoji: '🍸', name: 'Коктейль' },
  { id: 'teddy', emoji: '🧸', name: 'Мишка' },
];

export function listStickers() {
  return STICKERS;
}

export async function sendDM(
  fromId: number,
  toId: number,
  opts: { text?: string; stickerId?: string },
): Promise<DMMessageDTO> {
  if (fromId === toId) throw new Error('Нельзя отправить ЛС самому себе');

  // Проверим блок
  const blocked = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: toId, userBId: fromId, status: 'blocked' },
      ],
    },
  });
  if (blocked) throw new Error('Пользователь заблокировал тебя');

  const type: 'text' | 'sticker' = opts.stickerId ? 'sticker' : 'text';
  const text = (opts.text || (opts.stickerId ? STICKERS.find((s) => s.id === opts.stickerId)?.emoji || '' : '')).slice(0, 500);
  if (!text) throw new Error('Пустое сообщение');

  const msg = await prisma.directMessage.create({
    data: { fromUserId: fromId, toUserId: toId, text, type, stickerId: opts.stickerId || null },
  });

  const dto = toDTO(msg);
  const io = getIO();
  const sid = await redis.get(RKEY.userSocket(toId));
  if (sid) io.to(sid).emit('dm:message', dto);
  // Уведомление о новом ЛС если оффлайн
  notifyUser(toId, {
    type: 'message',
    title: 'Новое сообщение',
    body: text.slice(0, 50),
    payload: { fromId },
  }).catch(() => {});
  return dto;
}

export async function listDMs(userId: number, withId: number, limit = 50): Promise<DMMessageDTO[]> {
  const msgs = await prisma.directMessage.findMany({
    where: {
      OR: [
        { fromUserId: userId, toUserId: withId },
        { fromUserId: withId, toUserId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  // Отметим как прочитанные
  await prisma.directMessage.updateMany({
    where: { toUserId: userId, fromUserId: withId, isRead: false },
    data: { isRead: true },
  });
  return msgs.map(toDTO);
}

export async function listDMConversations(userId: number) {
  // Собираем последнее сообщение с каждым собеседником
  const all = await prisma.directMessage.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    orderBy: { createdAt: 'desc' },
  });
  const conv = new Map<number, typeof all[number]>();
  const unread = new Map<number, number>();
  for (const m of all) {
    const other = m.fromUserId === userId ? m.toUserId : m.fromUserId;
    if (!conv.has(other)) conv.set(other, m);
    if (m.toUserId === userId && !m.isRead) {
      unread.set(other, (unread.get(other) || 0) + 1);
    }
  }
  return Promise.all(
    Array.from(conv.entries()).map(async ([otherId, m]) => {
      const pub = await prisma.user.findUnique({ where: { id: otherId } });
      const sid = await redis.get(RKEY.userSocket(otherId));
      return {
        userId: otherId,
        name: pub?.name || 'Игрок',
        avatarUrl: pub?.avatarUrl || null,
        lastText: m.stickerId ? 'Стикер' : m.text,
        lastAt: m.createdAt.toISOString(),
        unreadCount: unread.get(otherId) || 0,
        online: !!sid,
      };
    }),
  );
}

function toDTO(m: any): DMMessageDTO {
  return {
    id: m.id,
    fromId: m.fromUserId,
    toId: m.toUserId,
    text: m.text,
    type: m.type,
    stickerId: m.stickerId,
    createdAt: m.createdAt.toISOString(),
  };
}
