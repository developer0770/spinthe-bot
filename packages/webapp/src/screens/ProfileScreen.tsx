import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore';
import { useRouter } from '../store/routerStore';
import { hapticSelect, hapticImpact } from '../utils/telegram';
import { useSocialSocket } from '../hooks/useSocialSocket';
import FriendsScreen from './FriendsScreen';
import AdminScreen from './AdminScreen';
import EditProfileScreen from './EditProfileScreen';
import InventoryScreen from './InventoryScreen';
import AchievementsScreen from './AchievementsScreen';
import SettingsScreen from './SettingsScreen';
import HelpScreen from './HelpScreen';

type Overlay =
  | null
  | 'friends'
  | 'admin'
  | 'edit'
  | 'inv'
  | 'ach'
  | 'settings'
  | 'help'
  | 'shop';

export default function ProfileScreen() {
  useSocialSocket();
  const me = useUserStore((s) => s.me);
  const setTab = useRouter((s) => s.setTab);
  const [overlay, setOverlay] = useState<Overlay>(null);

  const menuItems: { id: Overlay | 'shop'; icon: string; label: string; admin?: boolean }[] = [
    { id: 'edit', icon: '✏️', label: 'Редактировать профиль' },
    { id: 'inv', icon: '🎒', label: 'Мой инвентарь' },
    { id: 'ach', icon: '🏅', label: 'Достижения' },
    { id: 'friends', icon: '👥', label: 'Друзья' },
    { id: 'shop', icon: '💰', label: 'Пополнить баланс' },
    { id: 'settings', icon: '⚙️', label: 'Настройки' },
    { id: 'help', icon: '❓', label: 'Помощь' },
  ];
  if (me?.role && me.role !== 'user') {
    menuItems.push({ id: 'admin', icon: '🛡️', label: 'Админ-панель', admin: true });
  }

  const name = me?.name || 'Игрок';
  const age = me?.age ? `, ${me.age}` : '';
  const gender = me?.gender === 'female' ? '👩' : me?.gender === 'male' ? '👨' : '🧑';

  const onClick = (id: Overlay | 'shop') => {
    hapticSelect();
    if (id === 'friends') setOverlay('friends');
    else if (id === 'admin') setOverlay('admin');
    else if (id === 'edit') setOverlay('edit');
    else if (id === 'inv') setOverlay('inv');
    else if (id === 'ach') setOverlay('ach');
    else if (id === 'settings') setOverlay('settings');
    else if (id === 'help') setOverlay('help');
    else if (id === 'shop') {
      hapticImpact('light');
      setTab('shop');
    }
  };

  const close = () => setOverlay(null);

  return (
    <div className="h-full overflow-y-auto no-scrollbar pt-16 pb-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-5 flex flex-col items-center mb-5 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-pink/20 via-accent-purple/20 to-accent-blue/20" />
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-accent-pink via-accent-purple to-accent-blue flex items-center justify-center text-4xl font-black shadow-lg ring-4 ring-white/20 overflow-hidden ${me?.activeFrameId ? 'ring-4 ring-lime' : ''}`}>
              {me?.avatarUrl ? <img src={me.avatarUrl} className="w-full h-full object-cover" alt="" /> : name[0]}
            </div>
            {me?.isVip && <div className="absolute -top-1 -right-1 text-2xl animate-float">👑</div>}
          </div>
          <div className="mt-3 text-white text-2xl font-bold flex items-center gap-2 flex-wrap justify-center">
            {gender} {name}
            {me?.isVip && <span className="text-xs px-2 py-0.5 bg-accent-gold text-bg-900 rounded-full font-black">VIP</span>}
            {me?.role && me.role !== 'user' && (
              <span className="text-xs px-2 py-0.5 bg-danger text-white rounded-full font-black">
                {me.role === 'admin' ? 'ADMIN' : 'MOD'}
              </span>
            )}
          </div>
          <div className="text-white/60 text-sm">{age} • Уровень {me?.level ?? 1}</div>

          <div className="w-full mt-4">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Уровень {me?.level ?? 1}</span><span>{me?.xp ?? 0} / {((me?.level ?? 1)) * 100} XP</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((me?.xp ?? 0) % 100))}%` }}
                transition={{ delay: 0.3, duration: 1 }}
                className="h-full bg-gradient-to-r from-lime to-accent-orange rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-5 w-full">
            <Stat icon="💋" label="Поцелуи" value={me?.kissesCount ?? 0} />
            <Stat icon="❤️" label="Сердца" value={me?.hearts ?? 0} />
            <Stat icon="🪙" label="Монеты" value={me?.coins ?? 0} />
            <Stat icon="💎" label="Алмазы" value={me?.gems ?? 0} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { ic: '💰', l: 'Пополнить', c: 'from-accent-gold to-amber-600', action: () => setTab('shop') },
          { ic: '🎁', l: 'Подарки', c: 'from-accent-pink to-rose-600', action: () => setTab('shop') },
          { ic: '🎒', l: 'Инвентарь', c: 'from-accent-blue to-blue-700', action: () => setOverlay('inv') },
          { ic: '⚙️', l: 'Настройки', c: 'from-gray-500 to-gray-700', action: () => setOverlay('settings') },
        ].map((b, i) => (
          <motion.button
            key={b.l}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { hapticSelect(); b.action(); }}
            className={`rounded-2xl p-3 bg-gradient-to-br ${b.c} flex flex-col items-center gap-1 text-white text-center text-xs font-bold`}
          >
            <span className="text-2xl">{b.ic}</span>
            <span>{b.l}</span>
          </motion.button>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(item.id)}
            className={`w-full flex items-center gap-3 p-4 border-b border-white/10 last:border-0 active:bg-white/5 transition text-white ${item.admin ? 'text-danger' : ''}`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="flex-1 text-left font-semibold">{item.label}</span>
            <span className="text-white/40">›</span>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-white/30 text-xs mt-6">Spin the Bottle v1.0</p>

      <AnimatePresence>
        {overlay === 'friends' && <FriendsScreen onClose={close} />}
        {overlay === 'admin' && <AdminScreen onClose={close} />}
        {overlay === 'edit' && <EditProfileScreen onClose={close} />}
        {overlay === 'inv' && <InventoryScreen onClose={close} />}
        {overlay === 'ach' && <AchievementsScreen onClose={close} />}
        {overlay === 'settings' && <SettingsScreen onClose={close} />}
        {overlay === 'help' && <HelpScreen onClose={close} />}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl">{icon}</div>
      <div className="text-white font-bold">{value.toLocaleString('ru-RU')}</div>
      <div className="text-white/50 text-[10px] uppercase tracking-wide">{label}</div>
    </div>
  );
}
