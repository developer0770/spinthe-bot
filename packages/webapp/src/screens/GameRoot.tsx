import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import HomeScreen from './HomeScreen';
import PlayScreen from './PlayScreen';
import ShopScreen from './ShopScreen';
import LeaderboardScreen from './LeaderboardScreen';
import ProfileScreen from './ProfileScreen';
import { useRouter } from '../store/routerStore';
import { useRoomSocket } from '../hooks/useRoomSocket';

/**
 * Корневой лейаут игры с верхним и нижним барами и анимированным переключением вкладок.
 * На первом монтировании применяет deep link (startapp=room_XXXX), если есть.
 */
export default function GameRoot() {
  const tab = useRouter((s) => s.tab);
  const setTab = useRouter((s) => s.setTab);
  const { joinByCode } = useRoomSocket();

  useEffect(() => {
    // Применяем отложенный инвайт (из /startapp=room_XXX)
    try {
      const fn = (window as any).__spinthe_consumeInvite;
      if (typeof fn === 'function') {
        const code = fn();
        if (code) {
          setTab('play');
          // Небольшая задержка — сокет должен закончить коннект
          setTimeout(() => {
            joinByCode(code).catch(() => {});
          }, 500);
        }
      }
    } catch {}
  }, [joinByCode, setTab]);

  const pages: Record<string, JSX.Element> = {
    home: <HomeScreen />,
    play: <PlayScreen />,
    shop: <ShopScreen />,
    leaderboard: <LeaderboardScreen />,
    profile: <ProfileScreen />,
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-900">
      <Header />
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0"
          >
            {pages[tab]}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
