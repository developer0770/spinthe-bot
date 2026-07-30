import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export interface RecipientCandidate {
  userId: number;
  name: string;
  avatarUrl: string | null;
  gender?: 'male' | 'female' | null;
  meta?: string;
}

interface Props {
  gift: { id: string; name: string; emoji: string; priceHearts: number };
  friends: RecipientCandidate[];
  roomPlayers: RecipientCandidate[];
  onPick: (userId: number, name: string) => void;
  onClose: () => void;
}

/**
 * Модалка выбора получателя подарка:
 * сначала показываются игроки текущей комнаты (если в комнате),
 * затем все друзья. Себя выбрать нельзя.
 */
export default function GiftRecipientPicker({ gift, friends, roomPlayers, onPick, onClose }: Props) {
  const myId = useAuthStore((s) => s.user?.id);
  const seen = new Set<number>();
  const sections: { title: string; items: RecipientCandidate[] }[] = [];

  const room = roomPlayers.filter((p) => p.userId !== myId);
  const fr = friends.filter((p) => p.userId !== myId && !room.some((r) => r.userId === p.userId));

  if (room.length > 0) {
    sections.push({ title: 'В этой комнате', items: room });
    room.forEach((p) => seen.add(p.userId));
  }
  if (fr.length > 0) sections.push({ title: 'Друзья', items: fr });

  const empty = sections.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] bg-black/70 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white text-xl font-black">Кому подарить?</h3>
            <p className="text-white/60 text-sm flex items-center gap-2 mt-1">
              <span className="text-2xl">{gift.emoji}</span>
              <span className="font-bold text-white">{gift.name}</span>
              <span className="text-heart font-black">❤️ {gift.priceHearts}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 text-white/80 text-xl">
            ✕
          </button>
        </div>

        {empty && (
          <div className="py-12 text-center text-white/60">
            <div className="text-5xl mb-3">🤷</div>
            <p>Некому дарить — добавляй друзей или заходи в комнату!</p>
          </div>
        )}

        {sections.map((sec) => (
          <div key={sec.title} className="mb-4">
            <div className="text-white/50 text-xs uppercase font-bold tracking-widest mb-2 px-1">
              {sec.title}
            </div>
            <div className="flex flex-col gap-2">
              {sec.items.map((p) => {
                const color =
                  p.gender === 'female' ? '#ec4899' : p.gender === 'male' ? '#3b82f6' : '#94c92e';
                return (
                  <motion.button
                    key={p.userId}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onPick(p.userId, p.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/10 active:bg-white/20 transition text-left"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        p.name?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold truncate">{p.name}</div>
                      {p.meta && <div className="text-white/60 text-xs">{p.meta}</div>}
                    </div>
                    <div className="text-lime text-lg">🎁</div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
