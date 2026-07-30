import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSocialStore } from '../store/socialStore';
import {
  fetchFriends,
  fetchConversations,
  fetchDMs,
  acceptFriendRequest,
  removeFriend,
  sendFriendRequest,
  FriendDTO,
} from '../api/social';
import { useSocialSocket } from '../hooks/useSocialSocket';
import DMChat from '../components/chat/DMChat';
import { hapticImpact, hapticSelect } from '../utils/telegram';

interface Props {
  onClose: () => void;
}

type Tab = 'friends' | 'chats' | 'requests';

/**
 * Экран "Друзья и чаты".
 * Вкладки: Друзья / Чаты / Заявки.
 * При клике на друга/чат — открывается переписка.
 */
export default function FriendsScreen({ onClose }: Props) {
  useSocialSocket();
  const friends = useSocialStore((s) => s.friends);
  const conversations = useSocialStore((s) => s.conversations);
  const [tab, setTab] = useState<Tab>('friends');
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [activeUser, setActiveUser] = useState<FriendDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [addId, setAddId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, c] = await Promise.all([fetchFriends(), fetchConversations()]);
      useSocialStore.getState().setFriends(f);
      useSocialStore.getState().setConversations(c);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const requests = friends.filter((f) => f.status === 'pending_incoming');
  const outgoing = friends.filter((f) => f.status === 'pending_outgoing');
  const approved = friends.filter((f) => f.status === 'friend');

  const openChat = async (userId: number, user?: FriendDTO) => {
    hapticSelect();
    setActiveChatId(userId);
    const existing = user || friends.find((f) => f.userId === userId);
    if (existing) setActiveUser(existing);
    const msgs = await fetchDMs(userId);
    useSocialStore.getState().setMessages(userId, msgs);
  };

  const handleAccept = async (id: number) => {
    hapticImpact('medium');
    await acceptFriendRequest(id);
    load();
  };
  const handleRemove = async (id: number) => {
    hapticImpact('light');
    await removeFriend(id);
    useSocialStore.getState().removeFriend(id);
  };
  const handleAdd = async () => {
    const id = Number(addId);
    if (!id) return;
    hapticImpact('medium');
    try {
      await sendFriendRequest(id);
      setAddId('');
      load();
    } catch (e: any) {
      alert(e.message || 'Не удалось отправить заявку');
    }
  };

  if (activeChatId) {
    const partner = friends.find((f) => f.userId === activeChatId) ||
      conversations.find((c) => c.userId === activeChatId);
    const partnerOnline = 'online' in (partner || {}) ? (partner as any).online : activeUser?.online;
    return (
      <DMChat
        peerId={activeChatId}
        peerName={activeUser?.name || partner?.name || 'Игрок'}
        peerAvatar={activeUser?.avatarUrl || partner?.avatarUrl || null}
        online={!!partnerOnline}
        onBack={() => { setActiveChatId(null); setActiveUser(null); }}
      />
    );
  }

  const genderColor = (g?: string) =>
    g === 'female' ? '#ec4899' : g === 'male' ? '#3b82f6' : '#94c92e';

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-40 bg-bg-900 flex flex-col"
    >
      {/* Хедер */}
      <div className="h-14 bg-bg-800/95 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
        <button onClick={onClose} className="text-white/70 text-sm">‹ Закрыть</button>
        <h1 className="text-white text-lg font-bold">Друзья 💞</h1>
        <button onClick={load} className="text-white/70 text-xl">↻</button>
      </div>

      {/* Вкладки */}
      <div className="flex gap-1 p-2 bg-bg-800/60">
        {([
          { k: 'friends', label: `👥 Друзья (${approved.length})` },
          { k: 'chats', label: `💬 Чаты (${conversations.length})` },
          { k: 'requests', label: `🔔 Заявки (${requests.length + outgoing.length})` },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => { setTab(t.k); hapticSelect(); }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.k ? 'bg-lime text-bg-900' : 'text-white/70 bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        {loading && <div className="text-center text-white/60 py-10">Загрузка…</div>}

        {tab === 'friends' && (
          <>
            <div className="glass rounded-2xl p-3 mb-3 flex gap-2 items-center">
              <input
                value={addId}
                onChange={(e) => setAddId(e.target.value.replace(/\D/g, ''))}
                placeholder="ID игрока"
                inputMode="numeric"
                className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
              />
              <button
                onClick={handleAdd}
                className="bg-lime text-bg-900 px-4 py-2 rounded-xl text-sm font-bold active:scale-95"
              >
                + Добавить
              </button>
            </div>
            {approved.length === 0 && !loading && (
              <div className="text-center text-white/50 py-10">
                У тебя пока нет друзей. Добавляй игроков из комнаты! 👋
              </div>
            )}
            <div className="flex flex-col gap-2">
              {approved.map((f) => (
                <motion.button
                  key={f.userId}
                  layout
                  onClick={() => openChat(f.userId, f)}
                  className="glass rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition text-left"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold relative"
                    style={{ backgroundColor: genderColor(f.gender) }}
                  >
                    {f.avatarUrl ? (
                      <img src={f.avatarUrl} className="w-full h-full object-cover rounded-xl" />
                    ) : (f.name[0] || '?')}
                    {f.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-lime rounded-full border-2 border-bg-900" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold flex items-center gap-2">
                      {f.name}
                      {f.age && <span className="text-white/50 text-sm font-normal">{f.age}</span>}
                    </div>
                    <div className="text-white/60 text-xs">{f.online ? 'Онлайн' : 'Оффлайн'}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(f.userId); }}
                    className="text-white/40 hover:text-danger text-xs px-2"
                  >
                    ✕
                  </button>
                </motion.button>
              ))}
            </div>
          </>
        )}

        {tab === 'chats' && (
          <>
            {conversations.length === 0 && !loading && (
              <div className="text-center text-white/50 py-10">
                Пока нет сообщений. Напиши кому-нибудь первым! 💌
              </div>
            )}
            <div className="flex flex-col gap-2">
              {conversations.map((c) => (
                <motion.button
                  key={c.userId}
                  layout
                  onClick={() => openChat(c.userId)}
                  className="glass rounded-2xl p-3 flex items-center gap-3 active:scale-[0.98] transition text-left relative"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold relative"
                    style={{ backgroundColor: '#94c92e' }}
                  >
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} className="w-full h-full object-cover rounded-xl" />
                    ) : (c.name[0] || '?')}
                    {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-lime rounded-full border-2 border-bg-900" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold truncate">{c.name}</div>
                    <div className="text-white/60 text-xs truncate">{c.lastText}</div>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="bg-accent-pink text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </>
        )}

        {tab === 'requests' && (
          <>
            {requests.length === 0 && outgoing.length === 0 && !loading && (
              <div className="text-center text-white/50 py-10">Нет новых заявок 🎉</div>
            )}
            {requests.length > 0 && (
              <>
                <div className="text-white/70 text-sm font-bold mb-2 px-1">Входящие</div>
                <div className="flex flex-col gap-2 mb-4">
                  {requests.map((f) => (
                    <div key={f.userId} className="glass rounded-2xl p-3 flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: genderColor(f.gender) }}
                      >
                        {f.name[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold">{f.name}</div>
                        <div className="text-white/60 text-xs">Хочет добавить в друзья</div>
                      </div>
                      <button
                        onClick={() => handleAccept(f.userId)}
                        className="bg-lime text-bg-900 px-3 py-1.5 rounded-lg text-sm font-bold active:scale-95"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleRemove(f.userId)}
                        className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm active:scale-95 ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {outgoing.length > 0 && (
              <>
                <div className="text-white/70 text-sm font-bold mb-2 px-1">Исходящие</div>
                <div className="flex flex-col gap-2">
                  {outgoing.map((f) => (
                    <div key={f.userId} className="glass rounded-2xl p-3 flex items-center gap-3 opacity-70">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: genderColor(f.gender) }}
                      >
                        {f.name[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold">{f.name}</div>
                        <div className="text-white/60 text-xs">Заявка отправлена</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
