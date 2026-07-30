import { useEffect, useRef, useCallback } from 'react';
import { getSocket, connectSocket, AppSocket } from '../socket/client';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { useEconomyStore } from '../store/economyStore';
import { useSocialStore } from '../store/socialStore';
import { useUserStore } from '../store/userStore';
import { fetchFriends, fetchConversations, fetchNotifications } from '../api/social';
import { api } from '../api/client';

let bound = false;

/**
 * Подписывается один раз на события сокета, связанные с комнатой/игрой/чатом.
 * Возвращает хелперы для отправки команд.
 */
export function useRoomSocket() {
  const socketRef = useRef<AppSocket | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (bound) return;
    bound = true;
    const s = connectSocket();
    socketRef.current = s;

    if (!s.connected) s.connect();

    // ---- Room events ----
    s.on('room:joined', (data) => {
      useRoomStore.getState().setJoined(data);
    });
    s.on('room:player_joined', ({ player }) => {
      useRoomStore.getState().addPlayer(player);
    });
    s.on('room:player_left', ({ userId, reason, newHostId }) => {
      const me = useAuthStore.getState().user;
      if (me?.id === userId) {
        useRoomStore.getState().reset();
        return;
      }
      useRoomStore.getState().removePlayer(userId, reason, newHostId);
    });
    s.on('room:updated', ({ table }) => {
      useRoomStore.getState().setTable(table);
    });
    s.on('room:kicked', ({ reason }) => {
      useRoomStore.getState().setKicked(reason);
    });
    s.on('room:game_started', ({ game, table }) => {
      useRoomStore.getState().setGameStarted(game, table);
    });
    s.on('room:game_ended', ({ table }) => {
      useRoomStore.getState().setEnded(table);
    });

    // ---- Game events ----
    s.on('game:spin_started', ({ spinnerId, durationMs }) => {
      useRoomStore.getState().setSpinStarted(spinnerId, durationMs);
    });
    s.on('game:spin_result', (data) => {
      useRoomStore.getState().setSpinResult(data);
    });
    s.on('game:kissed', ({ fromId, toId, mutual }) => {
      useRoomStore.getState().setKissed(fromId, toId, mutual);
    });
    s.on('game:rejected', ({ fromId, toId }) => {
      useRoomStore.getState().setRejected(fromId, toId);
    });
    s.on('game:step_changed', ({ step, totalSteps, nextSpinnerId }) => {
      useRoomStore.getState().setStep(step, totalSteps, nextSpinnerId);
    });
    s.on('game:truth_or_dare', ({ targetId, card, deadlineAt }) => {
      useRoomStore.getState().setCard(targetId, card, deadlineAt);
    });

    // ---- Chat ----
    s.on('chat:message', (msg) => {
      const users = useRoomStore.getState().players;
      const sender = users.find((u) => u.userId === msg.senderId)?.user;
      useRoomStore.getState().addChat({
        id: `m-${msg.id || Date.now()}`,
        userId: msg.senderId,
        userName: msg.type === 'system' ? 'Система' : sender?.name || 'Игрок',
        text: msg.text,
        isSystem: msg.type === 'system',
        color:
          msg.type === 'system'
            ? '#94c92e'
            : sender?.gender === 'female'
            ? '#ec4899'
            : sender?.gender === 'male'
            ? '#3b82f6'
            : '#94c92e',
      });
    });

    // ---- Errors ----
    s.on('error', ({ message }) => {
      useRoomStore.getState().setError(message);
    });
    s.on('room:error', ({ message }) => {
      useRoomStore.getState().addChat({
        userId: null,
        userName: 'Система',
        text: `⚠️ ${message}`,
        isSystem: true,
        color: '#e53935',
      });
    });

    // Gift animation
    s.on('gift:animate' as any, (data: any) => {
      useEconomyStore.getState().addFlyGift({
        fromId: data.fromId,
        toId: data.toId,
        emoji: data.emoji,
        name: data.name,
      });
    });

    // Player reconnect after network glitch
    s.on('room:player_reconnected', ({ userId }: { userId: number }) => {
      useRoomStore.getState().setPlayerStatus(userId, 'online');
    });
    s.on('room:player_disconnected', ({ userId }: { userId: number }) => {
      useRoomStore.getState().setPlayerStatus(userId, 'reconnecting');
    });

    // Balance updates
    s.on('user:balance_changed', async () => {
      try {
        const j = await api<{ ok: true; me: any }>('/shop/me');
        if (j.ok && j.me) {
          useAuthStore.setState({ user: j.me });
          useUserStore.getState().setMe(j.me);
          try { localStorage.setItem('spinthe:user', JSON.stringify(j.me)); } catch {}
          try {
            const [f, c, n] = await Promise.all([fetchFriends(), fetchConversations(), fetchNotifications()]);
            useSocialStore.getState().setFriends(f);
            useSocialStore.getState().setConversations(c);
            useSocialStore.getState().setNotifications(n);
          } catch {}
        }
      } catch {}
    });
  }, []);

  // ---------- API-методы ----------
  const createRoom = useCallback(
    (opts: { name?: string; isPrivate: boolean; maxPlayers: number; totalRounds: number }) =>
      new Promise<{ ok: true } | { ok: false; error: string; code: string }>((resolve) => {
        const s = getSocket();
        if (!s.connected) s.connect();
        s.emit('room:create', opts, (res) => {
          if (res.ok) resolve({ ok: true });
          else resolve({ ok: false, error: res.error, code: res.code });
        });
      }),
    [],
  );

  const joinByCode = useCallback(
    (code: string) =>
      new Promise<{ ok: true } | { ok: false; error: string; code: string }>((resolve) => {
        const s = getSocket();
        if (!s.connected) s.connect();
        s.emit('room:join', { code }, (res) => {
          if (res.ok) resolve({ ok: true });
          else resolve({ ok: false, error: res.error, code: res.code });
        });
      }),
    [],
  );

  const joinById = useCallback(
    (tableId: number) =>
      new Promise<{ ok: true } | { ok: false; error: string; code: string }>((resolve) => {
        const s = getSocket();
        if (!s.connected) s.connect();
        s.emit('room:join', { tableId }, (res) => {
          if (res.ok) resolve({ ok: true });
          else resolve({ ok: false, error: res.error, code: res.code });
        });
      }),
    [],
  );

  const joinRandom = useCallback(
    () =>
      new Promise<{ ok: true } | { ok: false; error: string; code: string }>((resolve) => {
        const s = getSocket();
        if (!s.connected) s.connect();
        s.emit('room:join_random', (res) => {
          if (res.ok) resolve({ ok: true });
          else resolve({ ok: false, error: res.error, code: res.code });
        });
      }),
    [],
  );

  const leave = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const s = getSocket();
        s.emit('room:leave', () => {
          useRoomStore.getState().reset();
          resolve();
        });
      }),
    [],
  );

  const kickPlayer = useCallback(
    (userId: number) =>
      new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
        const s = getSocket();
        s.emit('room:kick', { userId }, (res) => {
          if (res.ok) resolve({ ok: true });
          else resolve({ ok: false, error: res.error });
        });
      }),
    [],
  );

  const startGame = useCallback(
    () =>
      new Promise<{ ok: true; gameId: string } | { ok: false; error: string }>((resolve) => {
        const s = getSocket();
        s.emit('room:start', (res) => {
          if (res.ok) resolve({ ok: true, gameId: res.gameId });
          else resolve({ ok: false, error: res.error });
        });
      }),
    [],
  );

  const fetchPublicRooms = useCallback(
    () =>
      new Promise<{ rooms: import('@spinthe/shared').PublicRoomDTO[] }>((resolve, reject) => {
        const s = getSocket();
        if (!s.connected) s.connect();
        s.emit('room:list_public', (res) => {
          if (res.ok) resolve({ rooms: res.rooms });
          else reject(new Error(res.error));
        });
      }),
    [],
  );

  const sendMessage = useCallback((text: string) => {
    const s = getSocket();
    s.emit('game:message', { text });
  }, []);

  // ---- Game actions ----
  const spin = useCallback(() => {
    const s = getSocket();
    s.emit('game:spin');
  }, []);

  const kiss = useCallback(() => {
    const s = getSocket();
    s.emit('game:kiss');
  }, []);

  const reject = useCallback(() => {
    const s = getSocket();
    s.emit('game:reject');
  }, []);

  const ready = useCallback(() => {
    const s = getSocket();
    s.emit('game:ready');
  }, []);

  return {
    createRoom,
    joinByCode,
    joinById,
    joinRandom,
    leave,
    kickPlayer,
    startGame,
    fetchPublicRooms,
    sendMessage,
    spin,
    kiss,
    reject,
    ready,
    socket: socketRef.current,
    user,
  };
}
