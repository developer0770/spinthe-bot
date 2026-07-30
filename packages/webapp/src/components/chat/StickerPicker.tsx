import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchStickers, StickerDTO } from '../../api/social';

interface Props {
  onPick: (sticker: StickerDTO) => void;
}

export default function StickerPicker({ onPick }: Props) {
  const [stickers, setStickers] = useState<StickerDTO[]>([]);
  useEffect(() => {
    fetchStickers().then(setStickers).catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-bg-800 border border-white/10 rounded-2xl p-3 shadow-2xl"
    >
      <div className="text-white/60 text-xs mb-2 uppercase tracking-wider font-bold">Стикеры</div>
      <div className="grid grid-cols-6 gap-2 max-h-56 overflow-y-auto no-scrollbar">
        {stickers.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s)}
            title={s.name}
            className="text-3xl p-2 rounded-xl hover:bg-white/10 active:scale-90 transition"
          >
            {s.emoji}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
