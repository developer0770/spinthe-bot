import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '../../store/socialStore';
import { useAuthStore } from '../../store/authStore';
import { sendDM, StickerDTO, fetchDMs } from '../../api/social';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';
import { hapticImpact, hapticSelect } from '../../utils/telegram';

interface Props {
  peerId: number;
  peerName: string;
  peerAvatar: string | null;
  online?: boolean;
  onBack: () => void;
}

export default function DMChat({ peerId, peerName, peerAvatar, online, onBack }: Props) {
  const me = useAuthStore((s) => s.user);
  const addMessage = useSocialStore((s) => s.addMessage);
  const storeMessages = useSocialStore((s) => s.messages[peerId] || []);
  const [messages, setMessages] = useState(storeMessages);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [sending, setSending] = useState(false);
  const peerOnline = !!online;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Подгружаем историю при открытии чата
    fetchDMs(peerId)
      .then((list) => setMessages(list))
      .catch(() => {});
  }, [peerId]);

  useEffect(() => {
    // Синхронизируем новые сообщения из стора
    if (storeMessages.length > messages.length) setMessages(storeMessages);
  }, [storeMessages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async (payload: { text?: string; stickerId?: string; stickerEmoji?: string }) => {
    if (sending) return;
    if (!payload.text && !payload.stickerId) return;
    setSending(true);
    setShowEmoji(false);
    setShowStickers(false);
    try {
      // Оптимистичное добавление сообщения в UI
      const tmpMsg = {
        id: Date.now(),
        fromId: me?.id || 0,
        toId: peerId,
        text: payload.text || payload.stickerEmoji || '',
        type: (payload.stickerId ? 'sticker' : 'text') as 'text' | 'sticker',
        stickerId: payload.stickerId || null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tmpMsg]);
      const sent = await sendDM(peerId, { text: payload.text, stickerId: payload.stickerId });
      // Заменяем временное сообщение на реальное с сервера
      setMessages((prev) => prev.map((m) => (m.id === tmpMsg.id ? sent : m)));
      addMessage(sent);
      setText('');
    } catch (e: any) {
      setMessages((prev) => prev.filter((m) => m.id !== Date.now()));
      alert(e.message || 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (text.trim()) send({ text: text.trim() });
    }
  };

  const peerColor = peerName ? '#ec4899' : '#3b82f6';

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-bg-900 flex flex-col"
    >
      {/* Header */}
      <div className="h-14 bg-bg-800/95 backdrop-blur border-b border-white/10 flex items-center px-3 gap-3 flex-shrink-0">
        <button onClick={onBack} className="text-white/70 text-xl p-1">‹</button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: peerColor }}
        >
          {peerAvatar ? <img src={peerAvatar} className="w-full h-full object-cover rounded-full" /> : peerName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold truncate">{peerName}</div>
          <div className={`text-xs ${peerOnline ? 'text-lime' : 'text-white/40'}`}>{peerOnline ? 'Онлайн' : 'Не в сети'}</div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2"
      >
        {messages.length === 0 && (
          <div className="text-center text-white/50 py-16 text-sm">
            Напиши первое сообщение 👋
          </div>
        )}
        {messages.map((m) => {
          const mine = m.fromId === me?.id;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                  mine
                    ? 'bg-gradient-to-br from-accent-orange to-red-500 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm'
                }`}
              >
                {m.type === 'sticker' ? (
                  <div className="text-5xl">{m.text}</div>
                ) : (
                  <div className="break-words whitespace-pre-wrap">{m.text}</div>
                )}
                <div className={`text-[10px] mt-0.5 ${mine ? 'text-white/70' : 'text-white/50'} text-right`}>
                  {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-white/10 bg-bg-800 relative flex-shrink-0">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => { hapticSelect(); setShowEmoji((v) => !v); setShowStickers(false); }}
            className="text-2xl p-1 active:scale-90 transition"
          >
            😊
          </button>
          <button
            onClick={() => { hapticSelect(); setShowStickers((v) => !v); setShowEmoji(false); }}
            className="text-2xl p-1 active:scale-90 transition"
          >
            🎟️
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => { setShowEmoji(false); setShowStickers(false); }}
            placeholder="Сообщение…"
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-white text-sm outline-none"
            maxLength={500}
          />
          <button
            onClick={() => text.trim() && send({ text: text.trim() })}
            disabled={!text.trim() || sending}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition ${
              text.trim() ? 'bg-accent-orange text-white' : 'bg-white/10 text-white/30'
            }`}
          >
            ➤
          </button>
        </div>

        <AnimatePresence>
          {showEmoji && (
            <div className="absolute bottom-14 left-0 right-0 px-2">
              <EmojiPicker onPick={(e) => { setText((t) => t + e); hapticImpact('light'); }} />
            </div>
          )}
          {showStickers && (
            <div className="absolute bottom-14 left-0 right-0 px-2">
              <StickerPicker onPick={(s: StickerDTO) => send({ stickerId: s.id, stickerEmoji: s.emoji, text: s.emoji })} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
