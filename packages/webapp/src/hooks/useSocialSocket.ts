import { useEffect } from 'react';
import { connectSocket } from '../socket/client';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authStore';
import { fetchFriends, fetchConversations, fetchNotifications } from '../api/social';

let bound = false;

/**
 * Подписывается на dm:message, friend:request, friend:accepted, notification:new.
 * Грузим начальный список друзей/диалогов/нотификаций при первом использовании.
 */
export function useSocialSocket() {
  const me = useAuthStore((s) => s.user);

  useEffect(() => {
    const s = connectSocket();
    if (!s.connected) s.connect();
    if (bound) return;
    bound = true;

    const loadInitial = async () => {
      try {
        const [friends, convs, notifs] = await Promise.all([
          fetchFriends().catch(() => []),
          fetchConversations().catch(() => []),
          fetchNotifications().catch(() => []),
        ]);
        useSocialStore.getState().setFriends(friends);
        useSocialStore.getState().setConversations(convs);
        useSocialStore.getState().setNotifications(notifs);
      } catch (e) {
        // Не критично, загрузим позже
      }
    };
    loadInitial();

    s.on('dm:message', (msg) => {
      useSocialStore.getState().addMessage(msg as any);
    });
    s.on('friend:request', async () => {
      try {
        const friends = await fetchFriends();
        useSocialStore.getState().setFriends(friends);
      } catch {}
    });
    s.on('friend:accepted', async () => {
      try {
        const friends = await fetchFriends();
        useSocialStore.getState().setFriends(friends);
      } catch {}
    });
    s.on('notification:new', (n) => {
      const s2 = useSocialStore.getState();
      s2.setNotifications([{ id: n.id, type: n.type, title: n.title, body: n.body, payload: n.payload, isRead: false, createdAt: n.createdAt }, ...s2.notifications]);
    });
  }, [me?.id]);
}
