import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { hapticImpact } from '../../utils/telegram';

interface Props {
  onKiss: () => void;
  onReject: () => void;
  onSpin: () => void;
  onReady: () => void;
  canSpin: boolean;
  isChoosing: boolean; // видны кнопки Поцеловать/Отказать
  isMyTurn: boolean;
  isCardShown: boolean; // Правда или действие
  targetName?: string;
  targetGender?: 'male' | 'female' | null;
  deadlineAt?: number | null;
  spinning: boolean;
}

/**
 * Нижняя панель действий: кнопка "Крутить" / "Поцеловать" / "Отказать" / "Готово"
 * С анимированным таймером.
 */
export default function ActionPanel({
  onKiss,
  onReject,
  onSpin,
  onReady,
  canSpin,
  isChoosing,
  isMyTurn,
  isCardShown,
  targetName,
  targetGender,
  deadlineAt,
  spinning,
}: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!deadlineAt) { setRemaining(0); return; }
    const tick = () => {
      const r = Math.max(0, deadlineAt - Date.now());
      setRemaining(r);
    };
    tick();
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [deadlineAt]);

  const seconds = Math.ceil(remaining / 1000);
  const total = isChoosing ? 15 : isCardShown ? 45 : 0;
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / (total * 1000))) : 0;

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isCardShown && (
          <motion.div
            key="ready"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            {deadlineAt && (
              <div className="text-white text-sm font-bold">
                ⏱ {seconds}с
              </div>
            )}
            <button
              onClick={() => { hapticImpact('medium'); onReady(); }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-lime to-lime-dark text-bg-900 text-lg font-bold shadow-glow active:scale-95 transition"
            >
              ✅ Готово
            </button>
          </motion.div>
        )}

        {isChoosing && isMyTurn && !isCardShown && (
          <motion.div
            key="choice"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="flex flex-col gap-2"
          >
            {targetName && (
              <div className="text-center text-white text-base">
                Тебе выпал(а) <span className={targetGender === 'female' ? 'text-pink-400 font-bold' : 'text-blue-400 font-bold'}>{targetName}</span>!
              </div>
            )}
            <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
              <motion.div
                className="absolute left-0 top-0 h-full bg-accent-pink"
                initial={{ width: '100%' }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { hapticImpact('medium'); onKiss(); }}
                className="py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-lg font-bold shadow-glow-pink active:scale-95 transition"
              >
                💋 Поцеловать
              </button>
              <button
                onClick={() => { hapticImpact('light'); onReject(); }}
                className="py-4 rounded-2xl bg-white/10 text-white/80 text-lg font-bold active:scale-95 transition"
              >
                ✖ Отказать
              </button>
            </div>
          </motion.div>
        )}

        {isChoosing && !isMyTurn && !isCardShown && (
          <motion.div
            key="wait-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full py-4 rounded-2xl bg-white/10 text-white/70 text-center font-semibold"
          >
            {targetName ? `💋 ${targetName} выбирает…` : 'Ждём выбор…'}
          </motion.div>
        )}

        {!isChoosing && !isCardShown && (
          <motion.div
            key="spin"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            {spinning ? (
              <div className="w-full py-4 rounded-2xl bg-white/10 text-white/70 text-center text-lg font-bold">
                🌀 Крутим…
              </div>
            ) : isMyTurn && canSpin ? (
              <button
                onClick={() => { hapticImpact('medium'); onSpin(); }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-orange to-red-500 text-white text-lg font-bold shadow-glow-orange active:scale-95 transition relative overflow-hidden"
              >
                <span className="relative z-10">🍾 Крутить бутылочку!</span>
                <motion.span
                  className="absolute inset-0 bg-white/10"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </button>
            ) : (
              <div className="w-full py-4 rounded-2xl bg-white/10 text-white/70 text-center font-semibold">
                ⏳ Ход другого игрока…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
