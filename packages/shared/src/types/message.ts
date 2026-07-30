export type MessageType = 'user' | 'system' | 'courtship' | 'gift' | 'event';

export interface MessageDTO {
  id: number;
  tableId: number;
  gameId: string | null;
  senderId: number | null;
  senderName: string | null;
  senderAvatar: string | null;
  senderGender: 'male' | 'female' | null;
  text: string;
  type: MessageType;
  isLocked: boolean;
  createdAt: string;
}
