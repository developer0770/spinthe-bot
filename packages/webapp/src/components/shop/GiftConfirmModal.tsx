import { motion } from 'framer-motion';

interface Props {
  gift: { id: string; name: string; emoji: string; priceHearts: number };
  targetName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function GiftConfirmModal({ gift, targetName, onConfirm, onCancel, loading }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] bg-black/60 flex items-center justify-center px-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-3xl p-6 max-w-sm w-full text-center"
      >
        <div className="text-7xl mb-3">{gift.emoji}</div>
        <h2 className="text-white text-xl font-black mb-1">Отправить подарок?</h2>
        <p className="text-white/70 text-sm mb-4">
          <span className="text-accent-pink font-bold">{gift.name}</span> для{' '}
          <span className="text-lime font-bold">{targetName}</span>
        </p>
        <div className="bg-heart/20 border border-heart/40 rounded-2xl py-3 mb-4">
          <span className="text-heart text-2xl font-black">❤️ {gift.priceHearts}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="py-3 rounded-xl bg-white/10 text-white font-bold active:scale-95"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="py-3 rounded-xl bg-gradient-to-r from-accent-pink to-rose-600 text-white font-black active:scale-95 disabled:opacity-50"
          >
            {loading ? '…' : 'Подарить 🎁'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
