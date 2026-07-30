import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { reportUser } from '../../api/admin';
import { sendGift, GiftItem } from '../../api/shop';
import { useEconomyStore } from '../../store/economyStore';
import { hapticImpact, hapticSelect } from '../../utils/telegram';

interface Props {
  open: boolean;
  userId?: number;
  userName?: string;
  isMe?: boolean;
  tableId?: number;
  onClose: () => void;
}

export default function PlayerActionsModal({ open, userId, userName, isMe, tableId, onClose }: Props) {
  const [view, setView] = useState<'menu' | 'gift'>('menu');
  const [loading, setLoading] = useState(false);
  const gifts = useEconomyStore((s) => s.gifts);

  useEffect(() => {
    if (!open) setView('menu');
  }, [open]);

  if (!userId) return null;

  const handleReport = async (reason: string) => {
    hapticImpact('medium');
    setLoading(true);
    try {
      await reportUser(userId, reason, undefined, tableId);
      alert('Жалоба отправлена');
      onClose();
    } catch (e: any) {
      alert(e?.message || 'Не удалось отправить жалобу');
    } finally {
      setLoading(false);
    }
  };

  const handleGift = async (g: GiftItem) => {
    hapticImpact('medium');
    if (!confirm(`Подарить ${g.emoji} ${g.name} за ${g.priceHearts}❤ ${userName}?`)) return;
    setLoading(true);
    try {
      await sendGift(userId, g.id, tableId);
      useEconomyStore.getState().refreshMe();
      alert('Подарок отправлен! 🎁');
      onClose();
    } catch (e: any) {
      alert(e?.message || 'Не удалось отправить подарок');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 flex items-end"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-bg-800 rounded-t-3xl p-4 max-h-[70vh] overflow-y-auto"
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg text-center mb-4">
              {view === 'menu' ? userName : '🎁 Выбрать подарок'}
            </h3>

            {isMe && view === 'menu' && (
              <p className="text-white/60 text-center mb-3">Это ты 👋</p>
            )}

            {view === 'menu' && !isMe && (
              <div className="space-y-2">
                <button
                  disabled={loading}
                  onClick={() => { hapticSelect(); setView('gift'); }}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold flex items-center gap-3 active:scale-95"
                >
                  🎁 <span className="flex-1 text-left">Подарить подарок</span> ›
                </button>
                <div className="glass rounded-2xl p-2">
                  <div className="text-white/60 text-xs p-2">🚩 Пожаловаться:</div>
                  {[
                    { r: 'spam', l: 'Спам / флуд' },
                    { r: 'abuse', l: 'Оскорбление' },
                    { r: 'cheating', l: 'Неспортивное поведение' },
                    { r: 'other', l: 'Другое' },
                  ].map((x) => (
                    <button
                      key={x.r}
                      disabled={loading}
                      onClick={() => handleReport(x.r)}
                      className="w-full p-3 rounded-xl text-left text-white/80 hover:bg-white/5 active:bg-white/10"
                    >
                      {x.l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'gift' && (
              <>
                <button onClick={() => setView('menu')} className="text-white/60 text-sm mb-2">‹ Назад</button>
                <div className="grid grid-cols-4 gap-2">
                  {gifts.map((g) => (
                    <button
                      key={g.id}
                      disabled={loading}
                      onClick={() => handleGift(g)}
                      className="glass rounded-2xl p-2 flex flex-col items-center gap-1 active:scale-95"
                    >
                      <div className="text-3xl">{g.emoji}</div>
                      <div className="text-white text-[10px] font-bold truncate w-full text-center">{g.name}</div>
                      <div className="text-heart text-[10px] font-bold">❤ {g.priceHearts}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={onClose}
              className="w-full mt-4 p-3 rounded-2xl bg-white/10 text-white/70 font-bold"
            >
              Отмена
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
