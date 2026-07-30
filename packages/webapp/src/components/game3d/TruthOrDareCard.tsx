import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  type: 'truth' | 'dare';
  text: string;
  deadlineAt: number;
  targetName: string;
  /** Для кого эта карточка (я — цель? или я спиннер? видна всем). */
}

/**
 * Модальная карточка поверх стола: "ПРАВДА" или "ДЕЙСТВИЕ" с таймером.
 */
export default function TruthOrDareCard({ type, text, deadlineAt, targetName }: Props) {
  const [remaining, setRemaining] = useState(Math.max(0, deadlineAt - Date.now()));

  useEffect(() => {
    const iv = setInterval(() => {
      setRemaining(Math.max(0, deadlineAt - Date.now()));
    }, 100);
    return () => clearInterval(iv);
  }, [deadlineAt]);

  const sec = Math.ceil(remaining / 1000);
  const isTruth = type === 'truth';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
    >
      <motion.div
        initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden ${
          isTruth
            ? 'bg-gradient-to-br from-blue-500 to-indigo-700'
            : 'bg-gradient-to-br from-pink-500 to-rose-700'
        }`}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10" />

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring' }}
            className="inline-block text-6xl mb-3"
          >
            {isTruth ? '❓' : '🔥'}
          </motion.div>
          <div className="text-white/80 text-sm uppercase tracking-widest font-bold mb-1">
            {isTruth ? 'Правда' : 'Действие'}
          </div>
          <h2 className="text-white text-3xl font-black mb-3">
            {targetName}
          </h2>
          <div className="bg-white/20 backdrop-blur rounded-2xl p-4 mb-4">
            <p className="text-white text-lg font-semibold leading-snug">
              {text}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${(remaining / (45 * 1000)) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <div className="text-white font-bold w-10 text-right">{sec}с</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
