import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useRoomStore } from '../../store/roomStore';
import { useRoomSocket } from '../../hooks/useRoomSocket';
import { hapticImpact, hapticSelect } from '../../utils/telegram';
import EmojiPicker, { COMMON_EMOJIS } from '../chat/EmojiPicker';

/**
 * Компактный чат: показывает последние N сообщений, поле ввода.
 * Используется и в лобби, и в игре.
 */
export default function ChatPanel() {
  const chat = useRoomStore((s) => s.chat);
  const { sendMessage } = useRoomSocket();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    hapticImpact('light');
    sendMessage(t);
    setText('');
    setShowEmoji(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur border-t border-black/10 px-3 pt-2 relative">
      <div
        ref={scrollRef}
        className="h-24 overflow-y-auto no-scrollbar flex flex-col gap-1 mb-1 text-sm"
      >
        {chat.length === 0 && (
          <div className="text-gray-400 text-xs text-center py-6">Напиши первое сообщение 👋</div>
        )}
        {chat.map((m) =>
          m.isSystem ? (
            <div key={m.id} className="text-center text-gray-500 text-[11px] italic px-2">
              {m.text}
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: m.color || '#94c92e' }}
              >
                {m.userName[0]?.toUpperCase() || '?'}
              </div>
              <div className="bg-gray-100 rounded-xl px-3 py-1.5 max-w-[78%]">
                <span className="font-bold text-xs" style={{ color: m.color || '#333' }}>
                  {m.userName}:
                </span>
                <span className="text-gray-800 break-words"> {m.text}</span>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="flex items-center gap-2 pb-2 relative">
        <button
          onClick={() => { hapticSelect(); setShowEmoji((v) => !v); }}
          className="text-2xl active:scale-90 transition"
        >
          😊
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Напиши сообщение…"
          className="flex-1 px-3 py-2 rounded-full bg-gray-100 text-black text-sm outline-none border border-transparent focus:border-accent-orange"
          maxLength={200}
          onFocus={() => setShowEmoji(false)}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition ${
            text.trim() ? 'bg-accent-orange text-white shadow-glow-orange' : 'bg-gray-200 text-gray-400'
          }`}
        >
          ➤
        </button>

        <AnimatePresence>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 right-0">
              <EmojiPicker onPick={(e) => setText((t) => t + e)} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Убираем неиспользуемый импорт
void COMMON_EMOJIS;
