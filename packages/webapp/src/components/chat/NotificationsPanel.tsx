import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSocialStore } from '../../store/socialStore';
import { fetchNotifications, markNotificationsRead, NotificationDTO } from '../../api/social';
import { hapticImpact } from '../../utils/telegram';

interface Props {
  onClose: () => void;
}

const ICONS: Record<string, string> = {
  friend_request: '👋',
  friend_accepted: '💞',
  gift_received: '🎁',
  kiss: '💋',
  message: '💬',
  system: 'ℹ️',
};

export default function NotificationsPanel({ onClose }: Props) {
  const notifs = useSocialStore((s) => s.notifications);
  const setNotifs = useSocialStore((s) => s.setNotifications);
  const markAll = useSocialStore((s) => s.markAllRead);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications()
      .then((n) => setNotifs(n))
      .finally(() => setLoading(false));
  }, [setNotifs]);

  const handleRead = async () => {
    hapticImpact('light');
    await markNotificationsRead();
    markAll();
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-bg-900 flex flex-col"
    >
      <div className="h-14 bg-bg-800/95 backdrop-blur border-b border-white/10 flex items-center px-4 gap-3 flex-shrink-0">
        <button onClick={onClose} className="text-white/70">‹ Закрыть</button>
        <h1 className="text-white text-lg font-bold flex-1">Уведомления 🔔</h1>
        {notifs.some((n) => !n.isRead) && (
          <button onClick={handleRead} className="text-lime text-sm font-bold">
            Прочитать все
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        {loading && <div className="text-center text-white/60 py-10">Загрузка…</div>}
        {!loading && notifs.length === 0 && (
          <div className="text-center text-white/50 py-16">Уведомлений пока нет 🎉</div>
        )}
        <div className="flex flex-col gap-2">
          {notifs.map((n: NotificationDTO) => (
            <div
              key={n.id}
              className={`rounded-2xl p-3 flex items-start gap-3 ${
                n.isRead ? 'glass' : 'bg-lime/10 border border-lime/40'
              }`}
            >
              <div className="text-3xl">{ICONS[n.type] || '🔔'}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">{n.title}</div>
                {n.body && <div className="text-white/70 text-xs mt-0.5">{n.body}</div>}
                <div className="text-white/40 text-[10px] mt-1">
                  {new Date(n.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
              {!n.isRead && <div className="w-2 h-2 rounded-full bg-lime mt-2" />}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
