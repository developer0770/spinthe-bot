import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  gift: { emoji: string; name: string };
  targetName: string;
  onDone: () => void;
}

/** Анимация успешной отправки подарка. */
export default function GiftSentOverlay({ gift, targetName, onDone }: Props) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1800);
    const t2 = setTimeout(onDone, 2200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="text-[120px] drop-shadow-[0_0_40px_rgba(236,72,153,0.8)]"
            >
              {gift.emoji}
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white text-2xl font-black mt-2"
            >
              Отправлено!
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-white/80 text-base"
            >
              <span className="text-accent-pink font-bold">{gift.name}</span> →{' '}
              <span className="text-lime font-bold">{targetName}</span>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="text-3xl mt-3"
            >
              💝✨
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
