import { PublicUserDTO } from './user';

export type TableStatus = 'waiting' | 'playing' | 'finished' | 'closed';

/**
 * DTO, отправляемый клиенту при входе в комнату.
 */
export interface TableDTO {
  id: number;
  tableNumber: number;
  name: string;
  roomCode: string;
  isPrivate: boolean;
  hostId: number;
  maxPlayers: number;
  totalRounds: number;
  status: TableStatus;
  currentGameId: string | null;
  players: TablePlayerSlotDTO[];
}

/**
 * Один слот/игрок за столом.
 */
export interface TablePlayerSlotDTO {
  userId: number;
  slotIndex: number;
  user: PublicUserDTO;
  isHost: boolean;
  isOnline: boolean;
}

/**
 * Краткая информация о публичной комнате для списка.
 */
export interface PublicRoomDTO {
  id: number;
  tableNumber: number;
  name: string;
  isPrivate: boolean;
  hostId: number;
  hostName: string;
  maxPlayers: number;
  playersCount: number;
  status: TableStatus;
}

/**
 * Параметры создания комнаты.
 */
export interface CreateRoomOptions {
  name?: string;
  isPrivate: boolean;
  maxPlayers: number;
  totalRounds: number;
}

/**
 * Результат присоединения к комнате.
 */
export interface JoinRoomResult {
  table: TableDTO;
  /** @deprecated — все данные лежат в table.players */
  players: TablePlayerSlotDTO[];
  slotIndex: number;
}
