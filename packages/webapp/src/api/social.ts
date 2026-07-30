import { api } from './client';

export interface FriendDTO {
  userId: number;
  name: string;
  avatarUrl: string | null;
  age: number | null;
  gender: 'male' | 'female';
  status: 'friend' | 'pending_outgoing' | 'pending_incoming' | 'blocked';
  online: boolean;
  lastMessage?: string;
  unreadCount?: number;
}

export interface ConversationDTO {
  userId: number;
  name: string;
  avatarUrl: string | null;
  lastText: string;
  lastAt: string;
  unreadCount: number;
  online: boolean;
}

export interface DMMessageDTO {
  id: number;
  fromId: number;
  toId: number;
  text: string;
  type: 'text' | 'sticker';
  stickerId?: string | null;
  createdAt: string;
}

export interface StickerDTO {
  id: string;
  emoji: string;
  name: string;
}

export interface NotificationDTO {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  payload?: any;
  isRead: boolean;
  createdAt: string;
}

export async function fetchFriends(): Promise<FriendDTO[]> {
  const r = await api<{ ok: true; friends: FriendDTO[] }>('/friends');
  return r.friends;
}

export async function sendFriendRequest(toId: number): Promise<void> {
  await api(`/friends/request/${toId}`, { method: 'POST' });
}

export async function acceptFriendRequest(fromId: number): Promise<void> {
  await api(`/friends/accept/${fromId}`, { method: 'POST' });
}

export async function removeFriend(userId: number): Promise<void> {
  await api(`/friends/remove/${userId}`, { method: 'POST' });
}

export async function blockUser(userId: number): Promise<void> {
  await api(`/friends/block/${userId}`, { method: 'POST' });
}

export async function fetchNotifications(): Promise<NotificationDTO[]> {
  const r = await api<{ ok: true; notifications: NotificationDTO[] }>('/friends/notifications');
  return r.notifications;
}

export async function markNotificationsRead(): Promise<void> {
  await api('/friends/notifications/read', { method: 'POST' });
}

export async function fetchConversations(): Promise<ConversationDTO[]> {
  const r = await api<{ ok: true; conversations: ConversationDTO[] }>('/dm/conversations');
  return r.conversations;
}

export async function fetchDMs(withId: number): Promise<DMMessageDTO[]> {
  const r = await api<{ ok: true; messages: DMMessageDTO[] }>(`/dm/${withId}`);
  return r.messages;
}

export async function sendDM(toId: number, payload: { text?: string; stickerId?: string }): Promise<DMMessageDTO> {
  const r = await api<{ ok: true; message: DMMessageDTO }>(`/dm/${toId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return r.message;
}

export async function fetchStickers(): Promise<StickerDTO[]> {
  const r = await api<{ ok: true; stickers: StickerDTO[] }>('/dm/stickers/list');
  return r.stickers;
}
