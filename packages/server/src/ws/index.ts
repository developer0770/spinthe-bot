import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt';
import { config } from '../config';
import { redis, RKEY } from '../db/redis';
import { prisma } from '../db/prisma';
import {
  createRoom,
  joinRoom,
  joinRandomRoom,
  leaveCurrentTable,
  kickPlayer,
  startGame,
  toTableDTO,
  getCurrentTableForUser,
  RoomError,
} from '../modules/rooms/rooms.service';
import { getUserDTO } from '../modules/users/users.service';
import {
  startSpin,
  submitChoice,
  completeCard,
  getSlotMap,
  GameError,
  getGameState,
  CHOICE_DURATION_MS,
  CARD_DURATION_MS,
  SPIN_DURATION_MS,
} from '../modules/game/game.service';
import * as friendsSvc from '../modules/friends/friends.service';
import * as dmSvc from '../modules/chat/dm.service';
import * as shopSvc from '../modules/shop/shop.service';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@spinthe/shared';

const DISCONNECT_GRACE_MS = 30_000; // 30 сек на переподключение
const disconnectTimers = new Map<number, NodeJS.Timeout>();
// Простой rate-limit на частые WS-события (чат, спин, действия)
const wsLastEvent = new Map<string, number>();
function wsThrottle(socketId: string, key: string, minMs: number): boolean {
  const k = `${socketId}:${key}`;
  const now = Date.now();
  const last = wsLastEvent.get(k) || 0;
  if (now - last < minMs) return false;
  wsLastEvent.set(k, now);
  return true;
}

let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function initWebSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: config.cors.origin === '*' ? true : config.cors.origin,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.query as any)?.token;
      if (typeof token !== 'string' || !token) return next(new Error('missing_token'));
      const payload = verifyAccessToken(token);
      if (!payload) return next(new Error('invalid_token'));
      const u = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isBanned: true, mutedUntil: true },
      });
      if (!u || u.isBanned) return next(new Error('banned'));
      (socket.data as SocketData).userId = payload.userId;
      (socket.data as SocketData).tableId = null;
      (socket.data as any).mutedUntil = u.mutedUntil;
      next();
    } catch {
      next(new Error('auth_failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    console.log(`[ws] user ${userId} connected (${socket.id})`);
    redis.set(RKEY.userSocket(userId), socket.id, 'EX', 3600);

    // Автоматическое восстановление комнаты после реконнекта
    const pending = disconnectTimers.get(userId);
    if (pending) {
      clearTimeout(pending);
      disconnectTimers.delete(userId);
    }
    try {
      const current = await getCurrentTableForUser(userId);
      if (current) {
        await socket.join(`table:${current.id}`);
        socket.data.tableId = current.id;
        await redis.set(RKEY.userTable(userId), String(current.id), 'EX', 3600);
        const me = await getUserDTO(userId);
        const state = await getGameState(current.id);
        socket.emit('room:joined', {
          table: current,
          game: null,
          players: current.players,
          me: me!,
          slotIndex: current.players.find((p) => p.userId === userId)?.slotIndex ?? -1,
        });
        if (state) {
          // Восстанавливаем фазу игры
          const restoredStatus: 'waiting' | 'spinning' | 'choosing' | 'chatting' | 'finished' =
            state.phase === 'finished' ? 'finished' :
            state.phase === 'spinning' ? 'spinning' :
            state.phase === 'choosing' ? 'choosing' :
            state.phase === 'truth_dare' ? 'chatting' : 'waiting';
          socket.emit('room:game_started', {
            game: {
              id: state.gameId,
              tableId: state.tableId,
              currentStep: state.currentStep,
              totalSteps: state.totalSteps,
              currentSpinnerId: state.spinnerId,
              currentTargetId: state.targetId,
              status: restoredStatus,
              isTutorial: false,
            },
            table: current,
          });
          // Отправляем актуальное состояние спина/карточки
          if (state.phase === 'spinning' && state.rotationDeg !== null) {
            socket.emit('game:spin_started', { spinnerId: state.spinnerId, durationMs: SPIN_DURATION_MS });
            const remaining = state.spinEndAt ? Math.max(0, state.spinEndAt - Date.now()) : SPIN_DURATION_MS;
            setTimeout(() => {
              socket.emit('game:spin_result', {
                spinnerId: state.spinnerId,
                targetId: state.targetId ?? 0,
                rotationDeg: state.rotationDeg ?? 0,
                step: state.currentStep,
              });
            }, remaining);
          } else if (state.phase === 'choosing' && state.targetId !== null) {
            socket.emit('game:spin_result', {
              spinnerId: state.spinnerId,
              targetId: state.targetId,
              rotationDeg: state.rotationDeg ?? 0,
              step: state.currentStep,
            });
          } else if (state.phase === 'truth_dare' && state.card) {
            socket.emit('game:truth_or_dare', {
              targetId: state.targetId ?? 0,
              card: state.card,
              deadlineAt: state.cardDeadline ?? Date.now() + CARD_DURATION_MS,
            });
          }
        }
        socket.to(`table:${current.id}`).emit('room:player_reconnected', { userId });
      }
    } catch (e) {
      console.error('[ws] restore state error:', e);
    }

    // ===== PING =====
    socket.on('ping', (data, cb) => {
      const ts = typeof data === 'object' && data?.ts ? data.ts : Date.now();
      if (typeof cb === 'function') cb({ ts: Date.now() });
      else socket.emit('pong', { ts: Date.now() });
      void ts;
    });

    // ===== ROOM:CREATE =====
    socket.on('room:create', async (data, cb) => {
      try {
        const result = await createRoom(userId, {
          name: data?.name,
          isPrivate: !!data?.isPrivate,
          maxPlayers: Number(data?.maxPlayers) || 8,
          totalRounds: Number(data?.totalRounds) || 5,
        });
        await attachToRoom(socket, result.table.id);
        const me = await getUserDTO(userId);
        io.to(`table:${result.table.id}`).emit('room:joined', {
          table: result.table,
          game: null,
          players: result.players,
          me: me!,
          slotIndex: result.slotIndex,
        });
        cb?.({ ok: true, data: result });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'create_failed', code: e?.code || 'create_failed' });
      }
    });

    // ===== ROOM:JOIN =====
    socket.on('room:join', async (data, cb) => {
      try {
        const result = await joinRoom(userId, { tableId: data?.tableId, code: data?.code });
        await attachToRoom(socket, result.table.id);
        const me = await getUserDTO(userId);
        socket.emit('room:joined', {
          table: result.table,
          game: null,
          players: result.players,
          me: me!,
          slotIndex: result.slotIndex,
        });
        const newSlot = result.players.find((p) => p.userId === userId);
        if (newSlot) socket.to(`table:${result.table.id}`).emit('room:player_joined', { player: newSlot });
        cb?.({ ok: true, data: result });
      } catch (e: any) {
        cb?.({
          ok: false,
          error: e?.message || 'join_failed',
          code: e instanceof RoomError ? e.code : 'join_failed',
        });
      }
    });

    // ===== ROOM:JOIN_RANDOM =====
    socket.on('room:join_random', async (cb) => {
      try {
        const result = await joinRandomRoom(userId);
        await attachToRoom(socket, result.table.id);
        const me = await getUserDTO(userId);
        socket.emit('room:joined', {
          table: result.table,
          game: null,
          players: result.players,
          me: me!,
          slotIndex: result.slotIndex,
        });
        const newSlot = result.players.find((p) => p.userId === userId);
        if (newSlot) socket.to(`table:${result.table.id}`).emit('room:player_joined', { player: newSlot });
        cb?.({ ok: true, data: result });
      } catch (e: any) {
        cb?.({
          ok: false,
          error: e?.message || 'no_room',
          code: e instanceof RoomError ? e.code : 'match_failed',
        });
      }
    });

    // ===== ROOM:LEAVE =====
    socket.on('room:leave', async (cb) => {
      try {
        const { tableId, wasHost } = await leaveCurrentTable(userId);
        await detachFromRoom(socket);
        if (tableId) {
          const newHost = await prisma.table.findUnique({
            where: { id: tableId },
            select: { hostId: true, status: true },
          });
          io.to(`table:${tableId}`).emit('room:player_left', {
            userId,
            reason: 'leave',
            newHostId: wasHost ? newHost?.hostId : undefined,
          });
          const table = await prisma.table.findUnique({ where: { id: tableId } });
          if (table) {
            const dto = await toTableDTO(table);
            io.to(`table:${tableId}`).emit('room:updated', { table: dto });
          }
        }
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'leave_failed' });
      }
    });

    // ===== ROOM:LIST_PUBLIC =====
    socket.on('room:list_public', async (cb) => {
      try {
        const roomsMod = await import('../modules/rooms/rooms.service');
        const rooms = await roomsMod.listPublicRooms(30);
        cb?.({ ok: true, rooms });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'list_failed' });
      }
    });

    // ===== ROOM:KICK =====
    socket.on('room:kick', async (data, cb) => {
      try {
        const { tableId } = await kickPlayer(userId, data.userId);
        const kickedSocketId = await redis.get(RKEY.userSocket(data.userId));
        if (kickedSocketId) {
          io.to(kickedSocketId).emit('room:kicked', { reason: 'kicked_by_host' });
          const kickedSocket = io.sockets.sockets.get(kickedSocketId);
          if (kickedSocket) {
            await kickedSocket.leave(`table:${tableId}`);
            kickedSocket.data.tableId = null;
          }
        }
        io.to(`table:${tableId}`).emit('room:player_left', { userId: data.userId, reason: 'kick' });
        const table = await prisma.table.findUnique({ where: { id: tableId } });
        if (table) {
          const dto = await toTableDTO(table);
          io.to(`table:${tableId}`).emit('room:updated', { table: dto });
        }
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({
          ok: false,
          error: e?.message || 'kick_failed',
          code: e instanceof RoomError ? e.code : 'kick_failed',
        });
      }
    });

    // ===== ROOM:START =====
    socket.on('room:start', async (cb) => {
      try {
        const { gameId, tableId, table } = await startGame(userId);
        io.to(`table:${tableId}`).emit('room:game_started', {
          game: {
            id: gameId,
            tableId,
            currentStep: 0,
            totalSteps: table.totalRounds,
            currentSpinnerId: userId,
            currentTargetId: null,
            status: 'waiting',
            isTutorial: false,
          },
          table,
        });
        cb?.({ ok: true, gameId });
      } catch (e: any) {
        cb?.({
          ok: false,
          error: e?.message || 'start_failed',
          code: e instanceof RoomError ? e.code : 'start_failed',
        });
      }
    });

    // ===== GAME:SPIN =====
    socket.on('game:spin', async () => {
      if (!wsThrottle(socket.id, 'spin', 1000)) return;
      try {
        const tableId = socket.data.tableId;
        if (!tableId) return;
        const { map, slots } = await getSlotMap(tableId);
        const { targetId, rotationDeg, durationMs } = await startSpin(tableId, userId, map, slots);

        io.to(`table:${tableId}`).emit('game:spin_started', { spinnerId: userId, durationMs });

        setTimeout(async () => {
          try {
            const curState = await getGameState(tableId);
            io.to(`table:${tableId}`).emit('game:spin_result', {
              spinnerId: userId,
              targetId,
              rotationDeg,
              step: curState?.currentStep ?? 0,
            });

            // Автоматический отказ по таймауту
            setTimeout(async () => {
              const s = await getGameState(tableId);
              if (!s || s.phase !== 'choosing' || s.spinnerId !== userId) return;
              try {
                await submitAutoReject(tableId, userId, s.targetId!);
              } catch (e) {
                console.error('[game] auto-reject err', e);
              }
            }, CHOICE_DURATION_MS);
          } catch (e) {
            console.error('[game] spin result err', e);
          }
        }, durationMs);
      } catch (e: any) {
        socket.emit('room:error', {
          code: e instanceof GameError ? e.code : 'spin_failed',
          message: e?.message || 'Не получается крутить',
        });
      }
    });

    // ===== GAME:KISS =====
    socket.on('game:kiss', async () => {
      if (!wsThrottle(socket.id, 'choice', 500)) return;
      try {
        const tableId = socket.data.tableId;
        if (!tableId) return;
        const s = await getGameState(tableId);
        if (!s) return;
        const res = await submitChoice(tableId, userId, 'kiss');
        io.to(`table:${tableId}`).emit('game:kissed', {
          fromId: userId,
          toId: s.targetId!,
          mutual: false,
        });
        await broadcastChoiceResult(tableId, res);
        // Автозавершение карточки по таймеру
        if ('card' in res && res.card) {
          scheduleAutoCardComplete(tableId, s.spinnerId);
        }
      } catch (e: any) {
        socket.emit('room:error', {
          code: e instanceof GameError ? e.code : 'kiss_failed',
          message: e?.message || 'Ошибка',
        });
      }
    });

    // ===== GAME:REJECT =====
    socket.on('game:reject', async () => {
      try {
        const tableId = socket.data.tableId;
        if (!tableId) return;
        const s = await getGameState(tableId);
        if (!s) return;
        const res = await submitChoice(tableId, userId, 'reject');
        io.to(`table:${tableId}`).emit('game:rejected', {
          fromId: userId,
          toId: s.targetId!,
        });
        await broadcastChoiceResult(tableId, res);
      } catch (e: any) {
        socket.emit('room:error', {
          code: e instanceof GameError ? e.code : 'reject_failed',
          message: e?.message || 'Ошибка',
        });
      }
    });

    // ===== GAME:READY =====
    socket.on('game:ready', async () => {
      try {
        const tableId = socket.data.tableId;
        if (!tableId) return;
        const res = await completeCard(tableId, userId);
        await emitAdvanceOrEnd(tableId, res);
      } catch (e: any) {
        socket.emit('room:error', {
          code: 'ready_failed',
          message: e?.message || 'Не удаётся завершить раунд',
        });
      }
    });

    // ===== GAME:MESSAGE =====
    socket.on('game:message', async (data) => {
      try {
        // rate-limit: не чаще 1 сообщения в 500мс, всего 30 в минуту
        if (!wsThrottle(socket.id, 'chat', 500)) return;
        const tableId = socket.data.tableId;
        if (!tableId) return;
        // Всегда проверяем актуальный статус мута из БД (а не из кэша сокета)
        const me = await prisma.user.findUnique({ where: { id: userId }, select: { mutedUntil: true } });
        if (me?.mutedUntil && new Date(me.mutedUntil) > new Date()) {
          socket.emit('room:error', { code: 'muted', message: `Ты в муте до ${me.mutedUntil.toLocaleTimeString('ru-RU')}` });
          return;
        }
        const text = String(data?.text || '').trim().slice(0, 300);
        if (!text) return;
        const msg = await prisma.message.create({
          data: { tableId, senderId: userId, text, type: 'user' },
        });
        io.to(`table:${tableId}`).emit('chat:message', {
          id: msg.id,
          tableId,
          gameId: null,
          senderId: userId,
          text,
          type: 'user',
          isLocked: false,
          createdAt: msg.createdAt.toISOString(),
        } as any);
      } catch (e: any) {
        console.error('[ws] chat err', e?.message);
      }
    });

    // ===== USER:TYPING =====
    socket.on('user:typing', () => {
      const tableId = socket.data.tableId;
      if (tableId) socket.to(`table:${tableId}`).emit('chat:typing', { userId });
    });

    // ===== DM:SEND =====
    socket.on('dm:send', async (data, cb) => {
      try {
        if (!data?.toId) { cb?.({ ok: false, error: 'no_recipient' }); return; }
        const toId = Number(data.toId);
        const msg = await dmSvc.sendDM(userId, toId, {
          text: data.text,
          stickerId: data.stickerId,
        });
        // Отправителю (подтверждение)
        socket.emit('dm:message', msg as any);
        // Получателю — в реальном времени
        const toSid = await redis.get(RKEY.userSocket(toId));
        if (toSid) io.to(toSid).emit('dm:message', msg as any);
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'send_failed' });
      }
    });

    // ===== FRIEND:REQUEST =====
    socket.on('friend:request', async (data, cb) => {
      try {
        await friendsSvc.sendFriendRequest(userId, Number(data.toId));
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'request_failed' });
      }
    });

    // ===== FRIEND:ACCEPT =====
    socket.on('friend:accept', async (data, cb) => {
      try {
        await friendsSvc.acceptFriendRequest(userId, Number(data.fromId));
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'accept_failed' });
      }
    });

    // ===== FRIEND:REMOVE =====
    socket.on('friend:remove', async (data, cb) => {
      try {
        await friendsSvc.removeFriend(userId, Number(data.userId));
        cb?.({ ok: true });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'remove_failed' });
      }
    });

    // ===== GAME:GIFT (отправка подарка из игры) =====
    socket.on('game:gift', async (data, cb?: (res: any) => void) => {
      try {
        if (!socket.data.tableId) { cb?.({ ok: false, error: 'not_in_room' }); return; }
        const r = await shopSvc.sendGift(userId, Number(data.toUserId), data.giftId, socket.data.tableId);
        cb?.({ ok: true, ...r });
      } catch (e: any) {
        cb?.({ ok: false, error: e?.message || 'gift_failed' });
      }
    });

    // ===== DISCONNECT =====
    socket.on('disconnect', async () => {
      console.log(`[ws] user ${userId} disconnected (grace ${DISCONNECT_GRACE_MS}ms)`);
      await redis.del(RKEY.userSocket(userId));
      const currentTable = socket.data.tableId;

      const existingTimer = disconnectTimers.get(userId);
      if (existingTimer) clearTimeout(existingTimer);

      if (currentTable) {
        // Уведомляем что отключился, но не выкидываем из БД сразу
        socket.to(`table:${currentTable}`).emit('room:player_disconnected', { userId });
        await socket.leave(`table:${currentTable}`);

        const timer = setTimeout(async () => {
          try {
            // Проверяем — не переподключился ли пользователь уже?
            const sid = await redis.get(RKEY.userSocket(userId));
            if (sid) {
              // Подключился заново — не выкидываем
              disconnectTimers.delete(userId);
              return;
            }
            const { tableId, wasHost } = await leaveCurrentTable(userId);
            disconnectTimers.delete(userId);
            if (tableId) {
              const newHost = await prisma.table.findUnique({
                where: { id: tableId },
                select: { hostId: true },
              });
              io.to(`table:${tableId}`).emit('room:player_left', {
                userId,
                reason: 'disconnect',
                newHostId: wasHost ? newHost?.hostId : undefined,
              });
              const t = await prisma.table.findUnique({ where: { id: tableId } });
              if (t) {
                const dto = await toTableDTO(t);
                io.to(`table:${tableId}`).emit('room:updated', { table: dto });
              }
            }
          } catch (e) {
            console.error('[ws] delayed leave err:', e);
          }
        }, DISCONNECT_GRACE_MS);
        disconnectTimers.set(userId, timer);
        socket.data.tableId = null;
      }
    });
  });

  return io;
}

// ==================== Вспомогательные функции ====================

async function attachToRoom(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  tableId: number,
) {
  if (socket.data.tableId && socket.data.tableId !== tableId) {
    await socket.leave(`table:${socket.data.tableId}`);
  }
  await socket.join(`table:${tableId}`);
  socket.data.tableId = tableId;
  await redis.set(RKEY.userTable(socket.data.userId), String(tableId), 'EX', 3600);
}

async function detachFromRoom(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
) {
  if (socket.data.tableId) {
    await socket.leave(`table:${socket.data.tableId}`);
    await redis.del(RKEY.userTable(socket.data.userId));
    socket.data.tableId = null;
  }
}

type AdvanceResult = Awaited<ReturnType<typeof completeCard>>;
type ChoiceRes = Awaited<ReturnType<typeof submitChoice>>;

/** Унифицированно послать результат выбора (целовать/отказать) с переходом на след.шаг или карточку. */
async function broadcastChoiceResult(tableId: number, res: ChoiceRes) {
  if (res.ended) {
    await emitEnd(tableId);
    return;
  }
  if (res.card) {
    io.to(`table:${tableId}`).emit('game:truth_or_dare', {
      targetId: (await getGameState(tableId))?.targetId ?? 0,
      card: res.card,
      deadlineAt: Date.now() + CARD_DURATION_MS,
    });
  } else if (res.nextSpinnerId) {
    io.to(`table:${tableId}`).emit('game:step_changed', {
      step: res.state.currentStep,
      totalSteps: res.state.totalSteps,
      nextSpinnerId: res.nextSpinnerId,
    });
  }
}

async function submitAutoReject(tableId: number, spinnerId: number, targetId: number) {
  const res = await submitChoice(tableId, spinnerId, 'reject');
  io.to(`table:${tableId}`).emit('game:rejected', { fromId: spinnerId, toId: targetId });
  await broadcastChoiceResult(tableId, res);
}

function scheduleAutoCardComplete(tableId: number, spinnerId: number) {
  setTimeout(async () => {
    const cur = await getGameState(tableId);
    if (!cur || cur.phase !== 'truth_dare') return;
    try {
      const adv = await completeCard(tableId, spinnerId);
      await emitAdvanceOrEnd(tableId, adv);
    } catch (e) {
      console.error('[game] auto-card err', e);
    }
  }, CARD_DURATION_MS);
}

async function emitAdvanceOrEnd(tableId: number, res: AdvanceResult) {
  if ('ended' in res) {
    await emitEnd(tableId);
  } else {
    io.to(`table:${tableId}`).emit('game:step_changed', {
      step: res.state.currentStep,
      totalSteps: res.state.totalSteps,
      nextSpinnerId: res.nextSpinnerId,
    });
  }
}

async function emitEnd(tableId: number) {
  const t = await prisma.table.findUnique({ where: { id: tableId } });
  if (t) {
    const dto = await toTableDTO(t);
    io.to(`table:${tableId}`).emit('room:game_ended', { results: [], table: dto });
  }
}

export function getIO() {
  if (!io) throw new Error('WS not initialized');
  return io;
}
