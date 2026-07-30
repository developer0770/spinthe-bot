import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  emoji: string;
  fromName: string;
  toName: string;
  giftName: string;
  onDone: () => void;
}

/** Полноэкранная анимация подарка: летит от отправителя к получателю с конфетти. */
export default function GiftAnimation({ emoji, fromName, toName, giftName, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2600);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  const sparkles = Array.from({ length: 20 });

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center pointer-events-none"
        >
          {sparkles.map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400 - 50,
                scale: 1,
                opacity: [0, 1, 0],
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 2, delay: i * 0.04 }}
              className="absolute text-3xl"
            >
              {['✨', '⭐', '💖', '💫'][i % 4]}
            </motion.div>
          ))}
          <motion.div
            initial={{ scale: 0, rotate: -180, y: 300 }}
            animate={{ scale: [0, 1.5, 1], rotate: 0, y: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, duration: 1.8 }}
            className="relative text-center"
          >
            <div className="text-[120px] drop-shadow-2xl">{emoji}</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/95 rounded-2xl px-5 py-3 shadow-xl"
            >
              <div className="text-bg-900 font-bold text-sm">{fromName} → {toName}</div>
              <div className="text-accent-pink font-black text-base">🎁 {giftName}</div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
