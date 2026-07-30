import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  fromName: string;
  toName: string;
  onDone: () => void;
}

/** Анимированный экран поздравления с поцелуем: сердечки, "💋 Поцелуй!" */
export default function KissOverlay({ fromName, toName, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const hearts = Array.from({ length: 14 }, (_, i) => i);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 bg-pink-500/10 backdrop-blur-[2px]" />
          {hearts.map((i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 0,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: -200 - Math.random() * 200,
                scale: 1 + Math.random(),
                opacity: [0, 1, 1, 0],
                rotate: (Math.random() - 0.5) * 60,
              }}
              transition={{ duration: 1.8, delay: i * 0.05, ease: 'easeOut' }}
              className="absolute text-4xl"
            >
              {i % 3 === 0 ? '💋' : '❤️'}
            </motion.div>
          ))}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            className="relative bg-white/95 rounded-3xl px-8 py-6 shadow-2xl text-center"
          >
            <div className="text-5xl mb-2">💋</div>
            <div className="text-2xl font-black text-pink-600 mb-1">Поцелуй!</div>
            <div className="text-gray-800 font-semibold">
              {fromName} → {toName}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
