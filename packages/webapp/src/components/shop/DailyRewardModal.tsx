import { motion } from 'framer-motion';
import { hapticImpact } from '../../utils/telegram';

interface Props {
  reward: { hearts: number; coins: number; gems: number };
  onClose: () => void;
}

export default function DailyRewardModal({ reward, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[55] bg-black/70 flex items-center justify-center px-6"
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 220 }}
        className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-400 to-orange-500 p-6 text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-200/30" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-red-500/20" />

        <div className="relative z-10">
          <motion.div
            initial={{ rotate: 0, scale: 0 }}
            animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: 1 }}
            transition={{ delay: 0.2, duration: 1, type: 'spring' }}
            className="text-7xl mb-3"
          >
            🎁
          </motion.div>
          <h2 className="text-white text-2xl font-black mb-1 drop-shadow">Ежедневная награда!</h2>
          <p className="text-white/90 text-sm mb-5">Заходи каждый день и получай бонусы</p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <Reward icon="❤️" value={`+${reward.hearts}`} label="сердечек" />
            <Reward icon="🪙" value={`+${reward.coins}`} label="монет" />
            {reward.gems > 0 && <Reward icon="💎" value={`+${reward.gems}`} label="алмазов" />}
            {reward.gems === 0 && <Reward icon="⭐" value="+10" label="опыта" />}
          </div>

          <button
            onClick={() => { hapticImpact('medium'); onClose(); }}
            className="w-full py-4 rounded-2xl bg-white text-orange-600 font-black text-lg shadow-lg active:scale-95 transition"
          >
            Забрать!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Reward({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-white/20 backdrop-blur rounded-2xl py-3">
      <div className="text-3xl">{icon}</div>
      <div className="text-white font-black text-lg">{value}</div>
      <div className="text-white/80 text-[10px] uppercase">{label}</div>
    </div>
  );
}
