import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { toPublicUserDTO } from '../users/users.service';
import { initGame } from '../game/game.service';
import {
  CreateRoomOptions,
  JoinRoomResult,
  PublicRoomDTO,
  TableDTO,
  TablePlayerSlotDTO,
  TableStatus,
} from '@spinthe/shared';

type TxClient = Prisma.TransactionClient;
type TablePlayerLike = { joinedAt: Date; userId: number; id: number; tableId: number; slotIndex: number; status: string; leftAt: Date | null };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих 0/O/1/I

/** Сгенерировать уникальный 6-значный буквенно-цифровой код комнаты. */
export async function generateRoomCode(len = 6): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < len; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const exists = await prisma.table.findUnique({ where: { roomCode: code }, select: { id: true } });
    if (!exists) return code;
  }
  // fallback на числовой с таймстампом
  return String(Date.now()).slice(-6);
}

/** Найти ближайший свободный номер стола (1..9999). */
async function nextTableNumber(): Promise<number> {
  const last = await prisma.table.findFirst({
    orderBy: { tableNumber: 'desc' },
    select: { tableNumber: true },
  });
  return (last?.tableNumber ?? 100) + 1;
}

/**
 * Получить все активные слоты игроков стола (status='active'), отсортированные по slotIndex.
 */
export async function getTablePlayers(tableId: number): Promise<TablePlayerSlotDTO[]> {
  const tp = await prisma.tablePlayer.findMany({
    where: { tableId, status: 'active' },
    orderBy: { slotIndex: 'asc' },
    include: { user: true },
  });

  const table = await prisma.table.findUnique({ where: { id: tableId }, select: { hostId: true } });
  const hostId = table?.hostId ?? -1;

  const slots: TablePlayerSlotDTO[] = [];
  for (const p of tp) {
    const pub = await toPublicUserDTO(p.userId);
    if (!pub) continue;
    slots.push({
      userId: p.userId,
      slotIndex: p.slotIndex,
      user: pub,
      isHost: p.userId === hostId,
      isOnline: true,
    });
  }
  return slots;
}

/** Превратить запись Table в TableDTO. */
export async function toTableDTO(t: {
  id: number;
  tableNumber: number;
  name: string;
  roomCode: string;
  isPrivate: boolean;
  hostId: number;
  maxPlayers: number;
  totalRounds: number;
  status: TableStatus | string;
  currentGameId: string | null;
}): Promise<TableDTO> {
  const players = await getTablePlayers(t.id);
  return {
    id: t.id,
    tableNumber: t.tableNumber,
    name: t.name,
    roomCode: t.roomCode,
    isPrivate: t.isPrivate,
    hostId: t.hostId,
    maxPlayers: t.maxPlayers,
    totalRounds: t.totalRounds,
    status: t.status as TableStatus,
    currentGameId: t.currentGameId,
    players,
  };
}

/** Найти свободный слот за столом. */
export function findFreeSlot(players: TablePlayerSlotDTO[], maxPlayers: number): number | null {
  const taken = new Set(players.map((p) => p.slotIndex));
  for (let i = 0; i < maxPlayers; i++) {
    if (!taken.has(i)) return i;
  }
  return null;
}

/** Создать новую комнату и посадить создателя за неё. */
export async function createRoom(
  hostId: number,
  opts: CreateRoomOptions,
): Promise<JoinRoomResult> {
  const maxPlayers = [4, 6, 8, 10, 12].includes(opts.maxPlayers) ? opts.maxPlayers : 8;
  const totalRounds = [3, 5, 10, 15].includes(opts.totalRounds) ? opts.totalRounds : 5;
  const name = (opts.name || 'Комната').trim().slice(0, 32) || `Стол #${Date.now().toString().slice(-4)}`;

  // Если пользователь уже в какой-то комнате — выкидываем сначала
  await leaveCurrentTable(hostId);

  const code = await generateRoomCode();
  const tableNumber = await nextTableNumber();

  const table = await prisma.$transaction(async (tx: TxClient) => {
    const created = await tx.table.create({
      data: {
        tableNumber,
        name,
        roomCode: code,
        isPrivate: !!opts.isPrivate,
        hostId,
        maxPlayers,
        totalRounds,
        status: 'waiting',
      },
    });
    await tx.tablePlayer.create({
      data: {
        tableId: created.id,
        userId: hostId,
        slotIndex: 0,
        status: 'active',
      },
    });
    return created;
  });

  const tableDTO = await toTableDTO(table);
  return { table: tableDTO, players: tableDTO.players, slotIndex: 0 };
}

/** Удалить пользователя из его текущего активного стола (если есть). */
export async function leaveCurrentTable(userId: number): Promise<{ tableId: number | null; wasHost: boolean }> {
  const tp = await prisma.tablePlayer.findFirst({
    where: { userId, status: 'active' },
    include: { table: true },
  });
  if (!tp) return { tableId: null, wasHost: false };

  await prisma.tablePlayer.update({
    where: { id: tp.id },
    data: { status: 'left', leftAt: new Date() },
  });

  const table = await prisma.table.findUnique({
    where: { id: tp.tableId },
    include: { players: { where: { status: 'active' } } },
  });
  const wasHost = !!table && table.hostId === userId;

  if (table) {
    const remaining = table.players.length;
    if (remaining === 0) {
      // Закрываем пустую комнату
      await prisma.table.update({
        where: { id: table.id },
        data: { status: 'closed', closedAt: new Date() },
      });
    } else if (wasHost) {
      // Передаём хост старейшему игроку
      const newHost = table.players.reduce((a: TablePlayerLike, b: TablePlayerLike) => (a.joinedAt <= b.joinedAt ? a : b));
      await prisma.table.update({
        where: { id: table.id },
        data: { hostId: newHost.userId },
      });
    }
  }

  return { tableId: tp.tableId, wasHost };
}

/** Присоединить пользователя к существующей комнате по id или коду. */
export async function joinRoom(
  userId: number,
  target: { tableId?: number; code?: string },
): Promise<JoinRoomResult> {
  const where = target.tableId
    ? { id: target.tableId }
    : target.code
    ? { roomCode: target.code.toUpperCase() }
    : null;
  if (!where) throw new RoomError('no_target', 'Укажите код или номер стола');

  let table = await prisma.table.findUnique({
    where: where as any,
    include: { players: { where: { status: 'active' } } },
  });
  if (!table) throw new RoomError('not_found', 'Комната не найдена');
  if (table.status === 'closed') throw new RoomError('closed', 'Комната закрыта');
  if (table.status === 'playing') throw new RoomError('in_progress', 'Игра уже идёт');

  // Проверка: если пользователь уже за этим столом — просто вернём текущее состояние
  const existing = await prisma.tablePlayer.findUnique({
    where: { tableId_userId: { tableId: table.id, userId } },
  });
  await leaveCurrentTable(userId);
  if (existing) {
    // переподключаем
    await prisma.tablePlayer.update({
      where: { id: existing.id },
      data: { status: 'active', leftAt: null },
    });
  }

  // Снова считаем игроков (leaveCurrentTable мог изменить их)
  table = (await prisma.table.findUnique({
    where: { id: table.id },
    include: { players: { where: { status: 'active' } } },
  }))!;

  if (table.players.length >= table.maxPlayers) {
    throw new RoomError('full', 'Комната заполнена');
  }

  const slots = await getTablePlayers(table.id);
  const slotIndex = findFreeSlot(slots, table.maxPlayers);
  if (slotIndex === null) throw new RoomError('full', 'Нет свободных мест');

  await prisma.tablePlayer.create({
    data: {
      tableId: table.id,
      userId,
      slotIndex,
      status: 'active',
    },
  });

  const tableDTO = await toTableDTO(table);
  return { table: tableDTO, players: tableDTO.players, slotIndex };
}

/** Матчмейкинг: найти любую публичную ожидающую неполную комнату, иначе бросить ошибку no_room. */
export async function joinRandomRoom(userId: number): Promise<JoinRoomResult> {
  const candidates = await prisma.table.findMany({
    where: {
      isPrivate: false,
      status: 'waiting',
    },
    include: { players: { where: { status: 'active' } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  for (const t of candidates as any[]) {
    if (t.players.length >= t.maxPlayers) continue;
    if (t.players.length < 1) continue; // не подсаживаем в совсем пустые (там нет хоста/ботов)
    return joinRoom(userId, { tableId: t.id });
  }

  throw new RoomError('no_room', 'Нет свободных публичных комнат. Создай свою!');
}

/** Кик игрока (только хост). */
export async function kickPlayer(
  hostId: number,
  targetUserId: number,
): Promise<{ tableId: number }> {
  const tp = await prisma.tablePlayer.findFirst({
    where: { userId: hostId, status: 'active' },
    include: { table: true },
  });
  if (!tp) throw new RoomError('not_in_room', 'Ты не в комнате');
  if (tp.table.hostId !== hostId) throw new RoomError('not_host', 'Только хост может кикать');
  if (targetUserId === hostId) throw new RoomError('self_kick', 'Нельзя кикнуть себя');

  const targetTP = await prisma.tablePlayer.findUnique({
    where: { tableId_userId: { tableId: tp.tableId, userId: targetUserId } },
  });
  if (!targetTP || targetTP.status !== 'active') {
    throw new RoomError('player_not_found', 'Игрок не в комнате');
  }
  await prisma.tablePlayer.update({
    where: { id: targetTP.id },
    data: { status: 'kicked', leftAt: new Date() },
  });
  return { tableId: tp.tableId };
}

/** Старт игры (только хост, нужно минимум 2 игрока). */
export async function startGame(hostId: number): Promise<{ gameId: string; tableId: number; table: TableDTO }> {
  const tp = await prisma.tablePlayer.findFirst({
    where: { userId: hostId, status: 'active' },
    include: { table: { include: { players: { where: { status: 'active' } } } } },
  });
  if (!tp) throw new RoomError('not_in_room', 'Ты не в комнате');
  if (tp.table.hostId !== hostId) throw new RoomError('not_host', 'Только хост может начать игру');
  if (tp.table.status !== 'waiting') throw new RoomError('already_started', 'Игра уже идёт');
  if (tp.table.players.length < 2) throw new RoomError('not_enough_players', 'Нужно минимум 2 игрока');

  const game = await prisma.game.create({
    data: {
      tableId: tp.tableId,
      totalSteps: tp.table.totalRounds,
      currentStep: 0,
      status: 'waiting',
      startedAt: new Date(),
      // Первый крутящий — хост
      currentSpinnerId: hostId,
    },
  });
  await prisma.table.update({
    where: { id: tp.tableId },
    data: { status: 'playing', currentGameId: game.id, startedAt: new Date() },
  });

  const updatedTable = await prisma.table.findUnique({ where: { id: tp.tableId } });
  const tableDTO = await toTableDTO(updatedTable!);
  // Инициализируем состояние игры в Redis
  await initGame(game.id, tp.tableId, hostId, tp.table.totalRounds);
  return { gameId: game.id, tableId: tp.tableId, table: tableDTO };
}

/** Список публичных комнат для отображения в меню. */
export async function listPublicRooms(limit = 30): Promise<PublicRoomDTO[]> {
  const tables = await prisma.table.findMany({
    where: { isPrivate: false, status: { in: ['waiting', 'playing'] } },
    include: {
      players: { where: { status: 'active' } },
      host: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return tables.map((t: any) => ({
    id: t.id,
    tableNumber: t.tableNumber,
    name: t.name,
    isPrivate: t.isPrivate,
    hostId: t.hostId,
    hostName: t.host.name || 'Игрок',
    maxPlayers: t.maxPlayers,
    playersCount: t.players.length,
    status: t.status as TableStatus,
  }));
}

/** Проверить, находится ли пользователь в какой-то комнате, вернуть её DTO если да. */
export async function getCurrentTableForUser(userId: number): Promise<TableDTO | null> {
  const tp = await prisma.tablePlayer.findFirst({
    where: { userId, status: 'active' },
  });
  if (!tp) return null;
  const t = await prisma.table.findUnique({ where: { id: tp.tableId } });
  if (!t) return null;
  return toTableDTO(t);
}

/** Ошибка в логике комнат с кодом. */
export class RoomError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
