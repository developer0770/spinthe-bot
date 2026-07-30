import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { fetchLeaderboard, LeaderEntry } from '../api/shop';
import { hapticSelect } from '../utils/telegram';
import { useAuthStore } from '../store/authStore';

type Category = 'kisses' | 'hearts' | 'level' | 'gifts' | 'friends';
type Period = 'day' | 'week' | 'all';

const CATEGORIES: { k: Category; label: string; icon: string }[] = [
  { k: 'kisses', label: 'Поцелуи', icon: '💋' },
  { k: 'hearts', label: 'Сердца', icon: '❤️' },
  { k: 'level', label: 'Уровень', icon: '⭐' },
  { k: 'gifts', label: 'Подарки', icon: '🎁' },
  { k: 'friends', label: 'Друзья', icon: '👥' },
];

const PERIODS: { k: Period; label: string }[] = [
  { k: 'day', label: 'День' },
  { k: 'week', label: 'Неделя' },
  { k: 'all', label: 'Всё время' },
];

export default function LeaderboardScreen() {
  const [category, setCategory] = useState<Category>('kisses');
  const [period, setPeriod] = useState<Period>('all');
  const [list, setList] = useState<LeaderEntry[]>([]);
  const [me, setMe] = useState<LeaderEntry | undefined>();
  const [loading, setLoading] = useState(true);
  const myId = useAuthStore((s) => s.user?.id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchLeaderboard(category, period);
      setList(r.list);
      setMe(r.me);
    } finally {
      setLoading(false);
    }
  }, [category, period]);

  useEffect(() => { load(); }, [load]);

  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  const colorOf = (g?: string) =>
    g === 'female' ? '#ec4899' : g === 'male' ? '#3b82f6' : '#94c92e';

  const avatarOf = (u: LeaderEntry, size = 48) => (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shadow-lg relative"
      style={{ backgroundColor: colorOf(u.gender), width: size, height: size, fontSize: size * 0.4 }}
    >
      {u.avatarUrl ? (
        <img src={u.avatarUrl} className="w-full h-full object-cover rounded-full" />
      ) : (u.name[0] || '?')}
      {u.isVip && <span className="absolute -top-1 -right-1 text-sm">👑</span>}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto no-scrollbar pt-16 pb-24 px-4">
      <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-white text-3xl font-bold mb-3">
        Рейтинг 🏆
      </motion.h2>

      {/* Фильтры */}
      <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={c.k}
            onClick={() => { setCategory(c.k); hapticSelect(); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-bold transition ${
              category === c.k ? 'bg-lime text-bg-900' : 'bg-white/10 text-white/70'
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.k}
            onClick={() => { setPeriod(p.k); hapticSelect(); }}
            className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition ${
              period === p.k ? 'bg-accent-orange text-white' : 'bg-white/10 text-white/70'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-white/60 py-10">Загрузка…</div>}

      {!loading && list.length === 0 && (
        <div className="text-center text-white/50 py-10">Пока нет данных в рейтинге 😔</div>
      )}

      {/* Подиум */}
      {!loading && podium.length >= 1 && (
        <div className="flex items-end justify-center gap-2 mb-6 mt-2">
          {podium[1] && (
            <PodiumEntry user={podium[1]} rank={2} height={110} color="#c0c0c0" avatar={avatarOf(podium[1])} />
          )}
          <PodiumEntry user={podium[0]} rank={1} height={140} color="#ffd700" avatar={avatarOf(podium[0])} crown />
          {podium[2] && (
            <PodiumEntry user={podium[2]} rank={3} height={90} color="#cd7f32" avatar={avatarOf(podium[2])} />
          )}
        </div>
      )}

      {/* Остальные */}
      {!loading && rest.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          {rest.map((u, i) => (
            <div
              key={u.userId}
              className={`flex items-center gap-3 p-3 border-b border-white/5 last:border-0 ${
                u.userId === myId ? 'bg-lime/10' : ''
              }`}
            >
              <div className="w-6 text-white/60 font-black text-center">{i + 4}</div>
              {avatarOf(u, 40)}
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold truncate">{u.name} {u.isVip && '👑'}</div>
                <div className="text-white/50 text-xs">Уровень {u.level}</div>
              </div>
              <div className="text-lime font-black">{formatScore(u.score, category)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Моя позиция */}
      {!loading && me && me.rank > 3 && (
        <div className="mt-4 glass rounded-2xl p-3 flex items-center gap-3 ring-2 ring-lime">
          <div className="w-8 text-lime font-black text-center">{me.rank}</div>
          {avatarOf(me, 44)}
          <div className="flex-1">
            <div className="text-white font-bold">{me.name} (Ты)</div>
            <div className="text-white/50 text-xs">Уровень {me.level}</div>
          </div>
          <div className="text-lime font-black">{formatScore(me.score, category)}</div>
        </div>
      )}
    </div>
  );
}

function PodiumEntry({
  user, rank, height, color, avatar, crown,
}: { user: LeaderEntry; rank: number; height: number; color: string; avatar: React.ReactNode; crown?: boolean }) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: rank * 0.1 }}
      className="flex flex-col items-center"
    >
      {crown && <div className="text-3xl mb-1 animate-bounce-arrow">👑</div>}
      <div className="mb-1">{avatar}</div>
      <div className="text-white text-xs font-bold max-w-[70px] truncate text-center">{user.name}</div>
      <div
        className="w-20 rounded-t-lg flex items-end justify-center pb-2 font-black text-white text-lg shadow-lg"
        style={{ height, backgroundColor: color }}
      >
        {rank}
      </div>
    </motion.div>
  );
}

function formatScore(n: number, c: Category): string {
  if (c === 'level') return `ур.${n}`;
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
