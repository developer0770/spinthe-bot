import { GiftDTO } from './gift';
import { MessageDTO } from './message';
import { PublicUserDTO, UserDTO } from './user';
import { TableDTO, TablePlayerSlotDTO, PublicRoomDTO, JoinRoomResult } from './table';
import { GameDTO, SpinResultDTO } from './game';
import { EventDTO } from './event';

// ==================== Client -> Server ====================
export interface ClientToServerEvents {
  // ---------- Room / Lobby ----------
  'room:create': (
    data: { name?: string; isPrivate: boolean; maxPlayers: number; totalRounds: number },
    cb?: (res: { ok: true; data: JoinRoomResult } | { ok: false; error: string; code: string }) => void,
  ) => void;
  'room:join': (
    data: { tableId?: number; code?: string },
    cb?: (res: { ok: true; data: JoinRoomResult } | { ok: false; error: string; code: string }) => void,
  ) => void;
  'room:join_random': (
    cb?: (res: { ok: true; data: JoinRoomResult } | { ok: false; error: string; code: string }) => void,
  ) => void;
  'room:leave': (cb?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  'room:list_public': (
    cb?: (res: { ok: true; rooms: PublicRoomDTO[] } | { ok: false; error: string }) => void,
  ) => void;
  'room:kick': (data: { userId: number }, cb?: (res: { ok: true } | { ok: false; error: string; code?: string }) => void) => void;
  'room:start': (cb?: (res: { ok: true; gameId: string } | { ok: false; error: string; code?: string }) => void) => void;
  'room:invite_info': () => void;

  // ---------- Game (реализуются в шаге 6, заглушки типов) ----------
  'game:spin': () => void;
  'game:kiss': () => void;
  'game:reject': () => void;
  'game:truth': (data: { answer?: string }) => void;
  'game:dare': (data: { result?: string }) => void;
  'game:ready': () => void;
  'game:message': (data: { text: string }) => void;
  'game:gift': (data: { toUserId: number; giftId: string }) => void;
  'user:typing': () => void;
  'event:claim': (data: { eventId: string }) => void;
  'table:switch': () => void;
  'dm:send': (data: { toId: number; text?: string; stickerId?: string }, cb?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  'friend:request': (data: { toId: number }, cb?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  'friend:accept': (data: { fromId: number }, cb?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  'friend:remove': (data: { userId: number }, cb?: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  ping: (data?: { ts: number }, cb?: (res: { ts: number }) => void) => void;
}

// ==================== Server -> Client ====================
export interface ServerToClientEvents {
  // ---------- Room ----------
  'room:joined': (data: {
    table: TableDTO;
    game: GameDTO | null;
    players: TablePlayerSlotDTO[];
    me: UserDTO;
    slotIndex: number;
  }) => void;
  'room:player_joined': (data: { player: TablePlayerSlotDTO }) => void;
  'room:player_left': (data: { userId: number; reason: 'leave' | 'switch' | 'kick' | 'disconnect' | 'admin_kick'; newHostId?: number }) => void;
  'room:player_disconnected': (data: { userId: number }) => void;
  'room:player_reconnected': (data: { userId: number }) => void;
  'room:updated': (data: { table: TableDTO }) => void;
  'room:kicked': (data: { reason?: string }) => void;
  'room:switched': (data: { table: TableDTO; game: GameDTO | null; players: TablePlayerSlotDTO[] }) => void;
  'room:game_started': (data: { game: GameDTO; table: TableDTO }) => void;
  'room:game_ended': (data: { results: unknown[]; table: TableDTO }) => void;
  'room:error': (data: { code: string; message: string }) => void;

  // ---------- Game ----------
  'game:spin_started': (data: { spinnerId: number; durationMs: number }) => void;
  'game:spin_result': (data: SpinResultDTO) => void;
  'game:choice_prompt': (data: { spinnerId: number; targetId: number; deadlineAt: number }) => void;
  'game:kissed': (data: { fromId: number; toId: number; mutual: boolean }) => void;
  'game:rejected': (data: { fromId: number; toId: number }) => void;
  'game:truth_or_dare': (data: { targetId: number; card: { type: 'truth' | 'dare'; text: string }; deadlineAt: number }) => void;
  'game:step_changed': (data: { step: number; totalSteps: number; nextSpinnerId: number }) => void;
  'game:counter_gift_offer': (data: { fromUser: PublicUserDTO; giftName: string; giftEmoji: string }) => void;
  'game:write_hint': (data: { targetId: number; targetGender: 'male' | 'female' }) => void;
  'game:ended': (data: { results: unknown[] }) => void;
  'game:tutorial_complete': () => void;

  // ---------- Chat ----------
  'chat:message': (data: MessageDTO) => void;
  'chat:typing': (data: { userId: number }) => void;

  // ---------- Direct Messages / Friends ----------
  'dm:message': (data: {
    id: number; fromId: number; toId: number; text: string; type: 'text' | 'sticker'; stickerId?: string | null; createdAt: string;
  }) => void;
  'friend:request': (data: { fromId: number; fromName?: string }) => void;
  'friend:accepted': (data: { userId: number; userName?: string }) => void;
  'notification:new': (data: {
    id: number; type: string; title: string; body?: string; payload?: any; createdAt: string;
  }) => void;

  // ---------- User balance / events ----------
  'user:balance_changed': (data: { hearts: number; delta: number; reason: string }) => void;
  'user:kissed_by': (data: { fromUser: PublicUserDTO }) => void;
  'user:courtship': (data: { fromUser: PublicUserDTO; heartsGained: number }) => void;

  'event:available': (data: { events: EventDTO[] }) => void;
  'event:claimed': (data: { eventId: string; rewards: unknown[]; newHearts: number }) => void;
  'gift:received': (data: { fromUser: PublicUserDTO; gift: GiftDTO }) => void;

  'system:modal': (data: { type: 'bonus' | 'tutorial_bonus' | 'info'; payload: unknown }) => void;
  'error': (data: { code: string; message: string }) => void;
  pong: (data: { ts: number }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: number;
  tableId: number | null;
}
