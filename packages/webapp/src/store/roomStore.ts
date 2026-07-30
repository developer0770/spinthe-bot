import { create } from 'zustand';
import type { TableDTO, TablePlayerSlotDTO, GameDTO, SpinResultDTO } from '@spinthe/shared';

export type RoomPhase = 'none' | 'lobby' | 'playing' | 'kicked' | 'error';
export type GamePhase =
  | 'awaiting_spin'
  | 'spinning'
  | 'choosing'
  | 'truth_dare'
  | 'ended';

interface ChatMessage {
  id: string;
  userId: number | null;
  userName: string;
  text: string;
  isSystem?: boolean;
  color?: string;
  ts: number;
}

export type ConnectionStatus = 'online' | 'reconnecting' | 'offline';

interface TruthOrDareCard {
  type: 'truth' | 'dare';
  text: string;
  targetId: number;
  deadlineAt: number;
}

interface RoomState {
  phase: RoomPhase;
  table: TableDTO | null;
  game: GameDTO | null;
  gamePhase: GamePhase;
  mySlotIndex: number;
  players: TablePlayerSlotDTO[];
  currentSpinnerId: number | null;
  currentTargetId: number | null;
  /** Финальный угол бутылочки в градусах (для 3D вращения) */
  bottleRotation: number;
  isSpinning: boolean;
  spinEndsAt: number | null;
  card: TruthOrDareCard | null;
  choiceDeadlineAt: number | null;
  chat: ChatMessage[];
  errorMsg: string | null;
  kissCelebration: { fromId: number; toId: number; mutual: boolean } | null;
  /** userId -> connection status (для отображения реконнекта) */
  playerConn: Record<number, ConnectionStatus>;

  setJoined: (data: {
    table: TableDTO;
    game: GameDTO | null;
    players: TablePlayerSlotDTO[];
    slotIndex: number;
  }) => void;
  setTable: (t: TableDTO) => void;
  setGame: (g: GameDTO | null) => void;
  setGameStarted: (g: GameDTO, t: TableDTO) => void;
  setSpinStarted: (spinnerId: number, durationMs: number) => void;
  setSpinResult: (r: SpinResultDTO) => void;
  setKissed: (fromId: number, toId: number, mutual: boolean) => void;
  setRejected: (fromId: number, toId: number) => void;
  setStep: (step: number, totalSteps: number, nextSpinnerId: number) => void;
  setCard: (targetId: number, card: { type: 'truth' | 'dare'; text: string }, deadlineAt: number) => void;
  clearCard: () => void;
  setEnded: (table: TableDTO) => void;
  addPlayer: (p: TablePlayerSlotDTO) => void;
  removePlayer: (userId: number, reason?: string, newHostId?: number) => void;
  addChat: (m: Partial<ChatMessage> & { userId: number | null; userName: string; text: string }) => void;
  setPlayerStatus: (userId: number, status: ConnectionStatus) => void;
  setKicked: (reason?: string) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

const initial: Pick<RoomState,
  | 'phase' | 'table' | 'game' | 'gamePhase' | 'mySlotIndex' | 'players'
  | 'currentSpinnerId' | 'currentTargetId' | 'bottleRotation' | 'isSpinning'
  | 'spinEndsAt' | 'card' | 'choiceDeadlineAt' | 'chat' | 'errorMsg'
  | 'kissCelebration' | 'playerConn'
> = {
  phase: 'none',
  table: null,
  game: null,
  gamePhase: 'awaiting_spin',
  mySlotIndex: -1,
  players: [],
  currentSpinnerId: null,
  currentTargetId: null,
  bottleRotation: 0,
  isSpinning: false,
  spinEndsAt: null,
  card: null,
  choiceDeadlineAt: null,
  chat: [],
  errorMsg: null,
  kissCelebration: null,
  playerConn: {},
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initial,

  setJoined: ({ table, game, players, slotIndex }) => {
    const playerConn: Record<number, ConnectionStatus> = {};
    for (const p of players) playerConn[p.userId] = 'online';
    set({
      table,
      game,
      players,
      mySlotIndex: slotIndex,
      phase: table.status === 'playing' ? 'playing' : 'lobby',
      gamePhase: table.status === 'playing' ? 'awaiting_spin' : 'awaiting_spin',
      currentSpinnerId: game?.currentSpinnerId ?? table.hostId,
      currentTargetId: null,
      isSpinning: false,
      errorMsg: null,
      bottleRotation: 0,
      playerConn,
    });
  },

  setTable: (t) =>
    set((s) => {
      const next = { ...s.playerConn };
      for (const p of t.players) {
        if (!(p.userId in next)) next[p.userId] = 'online';
      }
      for (const uid of Object.keys(next)) {
        if (!t.players.some((p) => p.userId === Number(uid))) delete next[Number(uid)];
      }
      return {
        table: t,
        players: t.players,
        playerConn: next,
        phase:
          t.status === 'playing' ? 'playing' : t.status === 'waiting' ? 'lobby' : s.phase,
      };
    }),

  setGame: (g) =>
    set({
      game: g,
      phase: g ? 'playing' : 'lobby',
      gamePhase: g ? 'awaiting_spin' : 'awaiting_spin',
    }),

  setGameStarted: (g, t) =>
    set((s) => ({
      game: g,
      table: t,
      phase: 'playing',
      gamePhase: 'awaiting_spin',
      currentSpinnerId: g.currentSpinnerId,
      currentTargetId: null,
      isSpinning: false,
      bottleRotation: 0,
      card: null,
      choiceDeadlineAt: null,
      chat: [
        ...s.chat,
        {
          id: `sys-${Date.now()}`,
          userId: null,
          userName: 'Система',
          text: '🎉 Игра началась!',
          isSystem: true,
          ts: Date.now(),
        },
      ],
    })),

  setSpinStarted: (spinnerId, durationMs) =>
    set((s) => ({
      gamePhase: 'spinning',
      currentSpinnerId: spinnerId,
      currentTargetId: null,
      isSpinning: true,
      spinEndsAt: Date.now() + durationMs,
      card: null,
      choiceDeadlineAt: null,
      bottleRotation: s.bottleRotation + 360 * 6 + Math.random() * 360, // будет уточнено в spin_result
    })),

  setSpinResult: (r) =>
    set(() => ({
      gamePhase: 'choosing',
      isSpinning: false,
      currentTargetId: r.targetId,
      bottleRotation: r.rotationDeg,
      spinEndsAt: null,
      choiceDeadlineAt: Date.now() + 15_000,
    })),

  setKissed: (fromId, toId, mutual) =>
    set({
      kissCelebration: { fromId, toId, mutual },
      // Карточка придёт отдельно (truth_or_dare)
      gamePhase: 'choosing', // до получения карты
    }),

  setRejected: () => set({ kissCelebration: null }),

  setStep: (step, totalSteps, nextSpinnerId) =>
    set((s) => ({
      game: s.game
        ? { ...s.game, currentStep: step, totalSteps, currentSpinnerId: nextSpinnerId, currentTargetId: null }
        : s.game,
      gamePhase: 'awaiting_spin',
      currentSpinnerId: nextSpinnerId,
      currentTargetId: null,
      isSpinning: false,
      card: null,
      choiceDeadlineAt: null,
      kissCelebration: null,
    })),

  setCard: (targetId, card, deadlineAt) =>
    set({
      gamePhase: 'truth_dare',
      card: { type: card.type, text: card.text, targetId, deadlineAt },
      choiceDeadlineAt: deadlineAt,
    }),

  clearCard: () => set({ card: null, choiceDeadlineAt: null }),

  setEnded: (table) =>
    set((s) => ({
      phase: 'lobby',
      gamePhase: 'ended',
      table,
      game: null,
      isSpinning: false,
      card: null,
      currentSpinnerId: null,
      currentTargetId: null,
      kissCelebration: null,
      chat: [
        ...s.chat,
        {
          id: `sys-end-${Date.now()}`,
          userId: null,
          userName: 'Система',
          text: '🏁 Игра окончена! Можете начать новую.',
          isSystem: true,
          ts: Date.now(),
        },
      ],
    })),

  addPlayer: (p) =>
    set((s) => {
      const existing = s.players.find((x) => x.userId === p.userId);
      const next = existing
        ? s.players
        : [...s.players, p].sort((a, b) => a.slotIndex - b.slotIndex);
      const conn = { ...s.playerConn, [p.userId]: 'online' as ConnectionStatus };
      return {
        players: next,
        playerConn: conn,
        chat: existing
          ? s.chat
          : [
              ...s.chat,
              {
                id: `sys-${Date.now()}`,
                userId: null,
                userName: 'Система',
                text: `${p.user.name} зашёл(ла) в комнату`,
                isSystem: true,
                ts: Date.now(),
              },
            ],
      };
    }),

  removePlayer: (userId, reason, newHostId) =>
    set((s) => {
      const p = s.players.find((x) => x.userId === userId);
      const rest = s.players.filter((x) => x.userId !== userId);
      const withHost = newHostId
        ? rest.map((pl) => ({ ...pl, isHost: pl.userId === newHostId }))
        : rest;
      const nextTable = s.table
        ? { ...s.table, hostId: newHostId ?? s.table.hostId, players: withHost }
        : s.table;
      return {
        players: withHost,
        table: nextTable,
        chat: [
          ...s.chat,
          {
            id: `sys-${Date.now()}`,
            userId: null,
            userName: 'Система',
            text: p
              ? reason === 'kick'
                ? `${p.user.name} был кикнут из комнаты`
                : `${p.user.name} покинул(а) комнату`
              : 'Игрок покинул комнату',
            isSystem: true,
            ts: Date.now(),
          },
        ],
      };
    }),

  addChat: (m) =>
    set((s) => ({
      chat: [
        ...s.chat.slice(-49),
        {
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          userId: m.userId ?? null,
          userName: m.userName,
          text: m.text,
          isSystem: m.isSystem,
          color: m.color,
          ts: m.ts ?? Date.now(),
        },
      ],
    })),

  setPlayerStatus: (userId, status) =>
    set((s) => {
      const p = s.players.find((x) => x.userId === userId);
      const msg =
        status === 'reconnecting'
          ? `${p?.user.name || 'Игрок'} потерял соединение, переподключается…`
          : status === 'online'
          ? `${p?.user.name || 'Игрок'} снова в сети!`
          : null;
      // Не добавляем чат если игрок не найден
      return {
        playerConn: { ...s.playerConn, [userId]: status },
        chat: msg && p
          ? [
              ...s.chat.slice(-49),
              {
                id: `sys-conn-${Date.now()}-${userId}`,
                userId: null,
                userName: 'Система',
                text: msg,
                isSystem: true,
                color: status === 'reconnecting' ? '#ff9800' : '#94c92e',
                ts: Date.now(),
              },
            ]
          : s.chat,
      };
    }),

  setKicked: (reason) =>
    set({ phase: 'kicked', errorMsg: reason || 'Тебя кикнули из комнаты' }),

  setError: (msg) => set({ phase: 'error', errorMsg: msg }),

  reset: () => set({ ...initial, chat: [], playerConn: {} }),
}));
