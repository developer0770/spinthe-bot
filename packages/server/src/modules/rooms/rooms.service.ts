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

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
  return String(Date.now()).slice(-6);
}

/** Найти ближайший свободный номер стола (101..9999). */
async function nextTableNumber(): Promise<number> {
  const last = await prisma.table.findFirst({
    orderBy: { tableNumber: 'desc' },
    select: { tableNumber: true },
  });
  return (last?.tableNumber ?? 100) + 1;
}

/** Получить все активные слоты игроков стола (status='active'). */
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

  // Очищаем предыдущие активные подключения пользователя
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

/** Удалить пользователя из его текущего активного стола. */
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
      await prisma.table.update({
        where: { id: table.id },
        data: { status: 'closed', closedAt: new Date() },
      });
    } else if (wasHost) {
      const newHost = table.players.reduce((a: TablePlayerLike, b: TablePlayerLike) => (a.joinedAt <= b.joinedAt ? a : b));
      await prisma.table.update({
        where: { id: table.id },
        data: { hostId: newHost.userId },
      });
    }
  }

  return { tableId: tp.tableId, wasHost };
}

/** Присоединить пользователя к комнате. */
export async function joinRoom(
  userId: number,
  target: { tableId?: number; code?: string },
): Promise<JoinRoomResult> {
  if (!target.tableId && !target.code) {
    throw new RoomError('no_target', 'Укажите код или номер стола');
  }

  const table = target.tableId
    ? await prisma.table.findUnique({ where: { id: target.tableId } })
    : await prisma.table.findUnique({ where: { roomCode: target.code!.toUpperCase() } });

  if (!table) throw new RoomError('not_found', 'Комната не найдена');
  if (table.status === 'closed') throw new RoomError('closed', 'Комната закрыта');
  if (table.status === 'playing') throw new RoomError('in_progress', 'Игра уже идёт');

  // 1. Покидаем все остальные столы
  await prisma.tablePlayer.updateMany({
    where: {
      userId,
      tableId: { not: table.id },
      status: 'active',
    },
    data: { status: 'left', leftAt: new Date() },
  });

  // 2. Выполняем транзакцию для предотвращения гонки состояний (Race Condition)
  return await prisma.$transaction(async (tx: TxClient) => {
    // Получаем текущих активных игроков транзакционно
    const activeTablePlayers = await tx.tablePlayer.findMany({
      where: { tableId: table.id, status: 'active' },
      orderBy: { slotIndex: 'asc' },
    });

    const isAlreadyActive = activeTablePlayers.some((p) => p.userId === userId);

    if (!isAlreadyActive && activeTablePlayers.length >= table.maxPlayers) {
      throw new RoomError('full', 'Комната заполнена');
    }

    // Ищем доступный слот
    const takenSlots = new Set(
      activeTablePlayers.filter((p) => p.userId !== userId).map((p) => p.slotIndex)
    );
    
    let slotIndex: number | null = null;
    for (let i = 0; i < table.maxPlayers; i++) {
      if (!takenSlots.has(i)) {
        slotIndex = i;
        break;
      }
    }

    if (slotIndex === null) throw new RoomError('full', 'Нет свободных мест');

    // Проверяем наличие любой существующей записи для этой пары (tableId, userId)
    const existingInThisTable = await tx.tablePlayer.findUnique({
      where: { tableId_userId: { tableId: table.id, userId } },
    });

    if (existingInThisTable) {
      await tx.tablePlayer.update({
        where: { id: existingInThisTable.id },
        data: {
          status: 'active',
          slotIndex,
          leftAt: null,
        },
      });
    } else {
      await tx.tablePlayer.create({
        data: {
          tableId: table.id,
          userId,
          slotIndex,
          status: 'active',
        },
      });
    }

    const updatedTable = await tx.table.findUnique({ where: { id: table.id } });
    const tableDTO = await toTableDTO(updatedTable!);
    return { table: tableDTO, players: tableDTO.players, slotIndex };
  });
}

/** Улучшенный Матчмейкинг: искать новые публичные комнаты и не возвращать в старые. */
export async function joinRandomRoom(userId: number): Promise<JoinRoomResult> {
  // 1. Принудительно закрываем все "зависшие" сессии пользователя, кроме текущей игры
  await prisma.tablePlayer.updateMany({
    where: {
      userId,
      table: { status: { in: ['waiting', 'closed'] } },
    },
    data: { status: 'left', leftAt: new Date() },
  });

  // 2. Ищем доступные комнаты, исключая те, откуда пользователя кикнули
  const candidates = await prisma.table.findMany({
    where: {
      isPrivate: false,
      status: 'waiting',
      players: {
        none: {
          userId,
          status: 'kicked', // Не закидываем туда, где игрок забанен
        },
      },
    },
    include: { players: { where: { status: 'active' } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // 3. Перебираем столы и подсаживаем к первому подходящему
  for (const t of candidates) {
    if (t.players.length >= t.maxPlayers) continue;
    if (t.players.length < 1) continue; 
    try {
      return await joinRoom(userId, { tableId: t.id });
    } catch (e) {
      // Если комната успела заполниться во время гонки запросов, переходим к следующей
      continue;
    }
  }

  // 4. Если свободных столов нет — автоматически создаем новый
  return createRoom(userId, { isPrivate: false, maxPlayers: 8, totalRounds: 5 });
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

/** Старт игры (только хост). */
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
      currentSpinnerId: hostId,
    },
  });
  await prisma.table.update({
    where: { id: tp.tableId },
    data: { status: 'playing', currentGameId: game.id, startedAt: new Date() },
  });

  const updatedTable = await prisma.table.findUnique({ where: { id: tp.tableId } });
  const tableDTO = await toTableDTO(updatedTable!);
  await initGame(game.id, tp.tableId, hostId, tp.table.totalRounds);
  return { gameId: game.id, tableId: tp.tableId, table: tableDTO };
}

/** Список публичных комнат. */
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

/** Проверить текущий стол пользователя. */
export async function getCurrentTableForUser(userId: number): Promise<TableDTO | null> {
  const tp = await prisma.tablePlayer.findFirst({
    where: { userId, status: 'active' },
  });
  if (!tp) return null;
  const t = await prisma.table.findUnique({ where: { id: tp.tableId } });  
  if (!t) return null;
  return toTableDTO(t);
}

export class RoomError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}