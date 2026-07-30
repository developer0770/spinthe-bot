import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';


// Список достижений соответствует seed'ам на сервере
const ACHIEVEMENTS = [
  { id: 'alien', name: 'Пришелец', desc: 'Тайное достижение', icon: '👽' },
  { id: 'battleship', name: 'Корабль', desc: 'Проведи 100 игр', icon: '🚢' },
  { id: 'guitar', name: 'Рок-н-ролл', desc: 'Получи 50 поцелуев', icon: '🎸' },
  { id: 'coffee_bag', name: 'Кофеман', desc: 'Подари 100 чашек кофе', icon: '☕' },
  { id: 'shaker', name: 'Бармен', desc: 'Подари 50 коктейлей', icon: '🍸' },
  { id: 'eiffel', name: 'Романтик', desc: 'Получи особый поцелуй', icon: '🗼' },
  { id: 'gift_box', name: 'Щедрый', desc: 'Подари 1000 подарков', icon: '🎁' },
  { id: 'anchor', name: 'Моряк', desc: 'Проведи 100 часов в игре', icon: '⚓' },
  { id: 'star_shades', name: 'Звезда', desc: 'Попади в топ-100 рейтинга', icon: '😎' },
  { id: 'energy_mug', name: 'Энерджайзер', desc: 'Проведи ночь в игре', icon: '🍵' },
  { id: 'party', name: 'Душа компании', desc: 'Пригласи 10 друзей', icon: '🎉' },
  { id: 'bagel', name: 'Сладкоежка', desc: 'Подари 500 сладких подарков', icon: '🥐' },
];

export default function AchievementsScreen({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<{ kisses: number; gifts: number; rank: number } | null>(null);
  useEffect(() => {
    api<{ ok: true; rank: number; giftsReceived: number; kisses: number }>('/users/me/stats')
      .then((r) => setStats({ kisses: r.kisses, gifts: r.giftsReceived, rank: r.rank }))
      .catch(() => {});
  }, []);
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-bg-900 flex flex-col"
    >
      <div className="h-14 bg-bg-800/95 border-b border-white/10 flex items-center px-4 gap-3 flex-shrink-0">
        <button onClick={onClose} className="text-white/70">‹ Назад</button>
        <h1 className="text-white text-lg font-bold flex-1">🏅 Достижения</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <p className="text-white/50 text-xs mb-4">Выполняй задания и получай награды!</p>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a, i) => {
            const progress = (() => {
              if (!stats) return 0;
              if (a.id === 'guitar') return Math.min(1, stats.kisses / 50);
              if (a.id === 'gift_box') return Math.min(1, stats.gifts / 1000);
              if (a.id === 'star_shades') return stats.rank <= 100 ? 1 : stats.rank <= 1000 ? 0.5 : 0;
              return 0;
            })();
            const unlocked = progress >= 1;
            const stars = Math.max(1, Math.ceil(progress * 5));
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass rounded-2xl p-3 flex flex-col items-center relative ${!unlocked ? 'grayscale opacity-60' : ''}`}
              >
                <div className="text-4xl mb-1">{a.icon}</div>
                <div className="text-white text-xs font-bold text-center">{a.name}</div>
                <div className="text-white/50 text-[10px] text-center mt-1">{a.desc}</div>
                <div className="mt-2 text-[10px] text-accent-gold tracking-widest">
                  {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
