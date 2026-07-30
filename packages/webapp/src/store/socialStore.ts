import { create } from 'zustand';
import type { FriendDTO, ConversationDTO, DMMessageDTO, NotificationDTO } from '../api/social';
import { useAuthStore } from './authStore';

interface SocialState {
  friends: FriendDTO[];
  conversations: ConversationDTO[];
  messages: Record<number, DMMessageDTO[]>;
  notifications: NotificationDTO[];
  unreadNotifs: number;
  activeChatId: number | null;

  setFriends: (f: FriendDTO[]) => void;
  setConversations: (c: ConversationDTO[]) => void;
  setMessages: (userId: number, m: DMMessageDTO[]) => void;
  addMessage: (m: DMMessageDTO) => void;
  setNotifications: (n: NotificationDTO[]) => void;
  markAllRead: () => void;
  setActiveChat: (id: number | null) => void;
  addOrUpdateFriend: (f: FriendDTO) => void;
  removeFriend: (id: number) => void;
  addConversation: (c: ConversationDTO) => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  friends: [],
  conversations: [],
  messages: {},
  notifications: [],
  unreadNotifs: 0,
  activeChatId: null,

  setFriends: (friends) => set({ friends }),
  setConversations: (conversations) => set({ conversations }),
  setMessages: (userId, messages) =>
    set((s) => ({ messages: { ...s.messages, [userId]: messages } })),
  addMessage: (m) => {
    const me = useAuthStore.getState().user;
    const myId = me?.id ?? 0;
    const other = m.fromId === myId ? m.toId : m.fromId;
    set((s) => {
      const cur = s.messages[other] || [];
      // избегаем дубликатов
      if (cur.some((x) => x.id === m.id)) return {};
      return {
        messages: { ...s.messages, [other]: [...cur, m] },
        conversations: s.conversations.map((c) =>
          c.userId === other
            ? {
                ...c,
                lastText: m.type === 'sticker' ? 'Стикер' : m.text,
                lastAt: m.createdAt,
                unreadCount: m.fromId === other ? c.unreadCount + 1 : c.unreadCount,
              }
            : c,
        ),
      };
    });
  },
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadNotifs: notifications.filter((n) => !n.isRead).length,
    }),
  markAllRead: () =>
    set((s) => ({
      unreadNotifs: 0,
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    })),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  addOrUpdateFriend: (f) =>
    set((s) => {
      const idx = s.friends.findIndex((x) => x.userId === f.userId);
      const next = [...s.friends];
      if (idx >= 0) next[idx] = f; else next.push(f);
      return { friends: next };
    }),
  removeFriend: (id) =>
    set((s) => ({ friends: s.friends.filter((f) => f.userId !== id) })),
  addConversation: (c) =>
    set((s) => {
      if (s.conversations.some((x) => x.userId === c.userId)) return { conversations: s.conversations };
      return { conversations: [c, ...s.conversations] };
    }),
}));
