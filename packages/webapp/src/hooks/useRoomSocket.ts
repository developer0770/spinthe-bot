import { useEffect, useRef, useCallback } from 'react';
import {
  getSocket,
  connectSocket,
  AppSocket,
  isListenersBound,
  markListenersBound,
} from '../socket/client';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '../store/authStore';
import { useEconomyStore } from '../store/economyStore';
import { useSocialStore } from '../store/socialStore';
import { useUserStore } from '../store/userStore';
import { fetchFriends, fetchConversations, fetchNotifications } from '../api/social';
import { api } from '../api/client';

/**
 * Подписывается один раз на события сокета, связанные с комнатой/игрой/чатом.
 * Возвращает хелперы для отправки команд.
 */
export function useRoomSocket() {
  const socketRef = useRef<AppSocket | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    // Используем централизованную проверку биндинга слушателей
    if (isListenersBound()) {
      socketRef.current = getSocket();
      return;
    }
    markListenersBound();

    const s = connectSocket();
    socketRef.current = s;

    if (!s.connected) s.connect();

    // ---- Room handlers ----
    const handleRoomJoined = (data: any) => {
      useRoomStore.getState().setJoined(data);
    };
    const handlePlayerJoined = ({ player }: any) => {
      useRoomStore.getState().addPlayer(player);
    };
    const handlePlayerLeft = ({ userId, reason, newHostId }: any) => {
      const me = useAuthStore.getState().user;
      if (me?.id === userId) {
        useRoomStore.getState().reset();
        return;
      }
      useRoomStore.getState().removePlayer(userId, reason, newHostId);
    };
    const handleRoomUpdated = ({ table }: any) => {
      useRoomStore.getState().setTable(table);
    };
    const handleRoomKicked = ({ reason }: any) => {
      useRoomStore.getState().setKicked(reason);
    };
    const handleGameStarted = ({ game, table }: any) => {
      useRoomStore.getState().setGameStarted(game, table);
    };
    const handleGameEnded = ({ table }: any) => {
      useRoomStore.getState().setEnded(table);
    };

    // ---- Game handlers ----
    const handleSpinStarted = ({ spinnerId, durationMs }: any) => {
      useRoomStore.getState().setSpinStarted(spinnerId, durationMs);
    };
    const handleSpinResult = (data: any) => {
      useRoomStore.getState().setSpinResult(data);
    };
    const handleKissed = ({ fromId, toId, mutual }: any) => {
      useRoomStore.getState().setKissed(fromId, toId, mutual);
    };
    const handleRejected = ({ fromId, toId }: any) => {
      useRoomStore.getState().setRejected(fromId, toId);
    };
    const handleStepChanged = ({ step, totalSteps, nextSpinnerId }: any) => {
      useRoomStore.getState().setStep(step, totalSteps, nextSpinnerId);
    };
    const handleTruthOrDare = ({ targetId, card, deadlineAt }: any) => {
      useRoomStore.getState().setCard(targetId, card, deadlineAt);
    };

    // ---- Chat ----
    const handleChatMessage = (msg: any) => {
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
    };

    // ---- Errors ----
    const handleError = ({ message }: { message: string }) => {
      useRoomStore.getState().setError(message);
    };
    const handleRoomError = ({ message }: { message: string }) => {
      useRoomStore.getState().addChat({
        userId: null,
        userName: 'Система',
        text: `⚠️ ${message}`,
        isSystem: true,
        color: '#e53935',
      });
    };

    // Gift animation
    const handleGiftAnimate = (data: { fromId: number; toId: number; emoji: string; name: string }) => {
      useEconomyStore.getState().addFlyGift({
        fromId: data.fromId,
        toId: data.toId,
        emoji: data.emoji,
        name: data.name,
      });
    };

    // Reconnection events
    const handlePlayerReconnected = ({ userId }: { userId: number }) => {
      useRoomStore.getState().setPlayerStatus(userId, 'online');
    };
    const handlePlayerDisconnected = ({ userId }: { userId: number }) => {
      useRoomStore.getState().setPlayerStatus(userId, 'reconnecting');
    };

    // Balance updates
    const handleBalanceChanged = async () => {
      try {
        const j = await api<{ ok: true; me: any }>('/shop/me');
        if (j.ok && j.me) {
          useAuthStore.setState({ user: j.me });
          useUserStore.getState().setMe(j.me);
          try {
            localStorage.setItem('spinthe:user', JSON.stringify(j.me));
          } catch {}
          try {
            const [f, c, n] = await Promise.all([
              fetchFriends(),
              fetchConversations(),
              fetchNotifications(),
            ]);
            useSocialStore.getState().setFriends(f);
            useSocialStore.getState().setConversations(c);
            useSocialStore.getState().setNotifications(n);
          } catch {}
        }
      } catch {}
    };

    // Регистрация слушателей
    s.on('room:joined', handleRoomJoined);
    s.on('room:player_joined', handlePlayerJoined);
    s.on('room:player_left', handlePlayerLeft);
    s.on('room:updated', handleRoomUpdated);
    s.on('room:kicked', handleRoomKicked);
    s.on('room:game_started', handleGameStarted);
    s.on('room:game_ended', handleGameEnded);

    s.on('game:spin_started', handleSpinStarted);
    s.on('game:spin_result', handleSpinResult);
    s.on('game:kissed', handleKissed);
    s.on('game:rejected', handleRejected);
    s.on('game:step_changed', handleStepChanged);
    s.on('game:truth_or_dare', handleTruthOrDare);

    s.on('chat:message', handleChatMessage);

    s.on('error', handleError);
    s.on('room:error', handleRoomError);

    s.on('gift:animate' as any, handleGiftAnimate);

    s.on('room:player_reconnected', handlePlayerReconnected);
    s.on('room:player_disconnected', handlePlayerDisconnected);

    s.on('user:balance_changed', handleBalanceChanged);

    // Очистка всех слушателей при размонтировании
    return () => {
      s.off('room:joined', handleRoomJoined);
      s.off('room:player_joined', handlePlayerJoined);
      s.off('room:player_left', handlePlayerLeft);
      s.off('room:updated', handleRoomUpdated);
      s.off('room:kicked', handleRoomKicked);
      s.off('room:game_started', handleGameStarted);
      s.off('room:game_ended', handleGameEnded);

      s.off('game:spin_started', handleSpinStarted);
      s.off('game:spin_result', handleSpinResult);
      s.off('game:kissed', handleKissed);
      s.off('game:rejected', handleRejected);
      s.off('game:step_changed', handleStepChanged);
      s.off('game:truth_or_dare', handleTruthOrDare);

      s.off('chat:message', handleChatMessage);

      s.off('error', handleError);
      s.off('room:error', handleRoomError);

      s.off('gift:animate' as any, handleGiftAnimate);

      s.off('room:player_reconnected', handlePlayerReconnected);
      s.off('room:player_disconnected', handlePlayerDisconnected);

      s.off('user:balance_changed', handleBalanceChanged);
    };
  }, [user]);

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