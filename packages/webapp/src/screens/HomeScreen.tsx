import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from '../store/routerStore';
import { useUserStore } from '../store/userStore';
import { hapticImpact } from '../utils/telegram';
import { api } from '../api/client';

interface HomeStats {
  rank: number;
  giftsReceived: number;
  kisses: number;
}

/**
 * Главная страница: приветствие, статистика, быстрые действия, баннеры ивентов.
 */
export default function HomeScreen() {
  const me = useUserStore((s) => s.me);
  const setTab = useRouter((s) => s.setTab);
  const openModal = useRouter((s) => s.openModal);
  const [stats, setStats] = useState<HomeStats>({ rank: 0, giftsReceived: 0, kisses: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingStats(true);
    api<{ ok: true; rank: number; giftsReceived: number; kisses: number }>('/users/me/stats')
      .then((r) => {
        if (!active) return;
        if (r.ok) setStats({ rank: r.rank, giftsReceived: r.giftsReceived, kisses: r.kisses });
      })
      .catch(() => {})
      .finally(() => active && setLoadingStats(false));
    return () => { active = false; };
  }, [me?.id, me?.kissesCount]);

  const quickActions = [
    { id: 'play', icon: '🎯', label: 'Быстрая игра', color: 'from-lime to-lime-dark', tab: 'play' as const },
    { id: 'create', icon: '➕', label: 'Создать комнату', color: 'from-accent-blue to-blue-700' },
    { id: 'join', icon: '🔗', label: 'Войти по коду', color: 'from-accent-purple to-purple-700' },
    { id: 'friends', icon: '👥', label: 'Друзья', color: 'from-accent-pink to-pink-700' },
  ];

  const banners = [
    { id: 'daily', icon: '🎁', title: 'Ежедневная награда', sub: 'Заходи каждый день — получи бонусы!', cta: 'Забрать', color: 'from-accent-orange to-red-500', action: () => setTab('shop') },
    { id: 'vip', icon: '👑', title: 'VIP-статус', sub: 'Безлимит подарков и уникальные рамки', cta: 'Подробнее', color: 'from-vip to-amber-700', action: () => setTab('shop') },
    { id: 'leaderboard', icon: '🏆', title: 'Лидерборд', sub: 'Стань самым популярным — целуй больше!', cta: 'Смотреть', color: 'from-accent-pink to-rose-700', action: () => setTab('leaderboard') },
  ];

  const kisses = me?.kissesCount ?? stats.kisses ?? 0;
  const rankText = loadingStats ? '…' : stats.rank > 0 ? `#${stats.rank}` : '—';
  const giftsText = loadingStats ? '…' : stats.giftsReceived;

  const statItems = [
    { icon: '💋', label: 'Поцелуи', value: kisses, color: 'text-accent-pink' },
    { icon: '❤️', label: 'Сердечки', value: me?.hearts ?? 0, color: 'text-heart' },
    { icon: '🏆', label: 'Рейтинг', value: rankText, color: 'text-accent-gold' },
    { icon: '🎁', label: 'Подарков', value: giftsText, color: 'text-accent-purple' },
  ];

  return (
    <div className="h-full overflow-y-auto no-scrollbar pt-16 pb-20 px-4">
      {/* Приветствие */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 mb-5"
      >
        <p className="text-white/60 text-sm">Привет,</p>
        <h2 className="text-white text-3xl font-bold">
          {me?.name || 'Игрок'} <span className="inline-block animate-float">👋</span>
        </h2>
        <p className="text-white/50 text-sm mt-1">Готов целоваться и знакомиться?</p>
      </motion.div>

      {/* Статистика */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2 mb-6"
      >
        {statItems.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-3 flex flex-col items-center text-center">
            <span className="text-2xl">{s.icon}</span>
            <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            <span className="text-white/50 text-[10px] uppercase tracking-wide">{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Быстрые действия */}
      <div className="mb-6">
        <h3 className="text-white font-bold text-lg mb-3">Играть</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 200 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                hapticImpact('light');
                if (a.tab) setTab(a.tab);
                else openModal(a.id);
              }}
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${a.color} text-left shadow-lg h-28`}
            >
              <span className="text-3xl">{a.icon}</span>
              <span className="block text-white font-bold mt-2 text-base">{a.label}</span>
              <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Баннеры / ивенты */}
      <div className="mb-4">
        <h3 className="text-white font-bold text-lg mb-3">События</h3>
        <div className="flex flex-col gap-3">
          {banners.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r ${b.color} shadow-xl flex items-center justify-between cursor-pointer`}
              onClick={() => { hapticImpact('light'); b.action?.(); }}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl animate-float">{b.icon}</span>
                <div>
                  <div className="text-white font-bold">{b.title}</div>
                  <div className="text-white/90 text-xs">{b.sub}</div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); hapticImpact('light'); b.action?.(); }}
                className="px-4 py-1.5 rounded-full glass-strong text-white text-sm font-semibold active:scale-90 transition"
              >
                {b.cta}
              </button>
              <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
