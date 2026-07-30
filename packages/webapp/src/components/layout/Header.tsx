import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../store/userStore';
import { closeApp } from '../../utils/telegram';
import FriendsScreen from '../../screens/FriendsScreen';
import NotificationsPanel from '../chat/NotificationsPanel';
import { useSocialSocket } from '../../hooks/useSocialSocket';
import { useSocialStore } from '../../store/socialStore';
import { fetchDailyStatus } from '../../api/shop';

export default function Header() {
  useSocialSocket();
  const me = useUserStore((s) => s.me);
  const unreadNotifs = useSocialStore((s) => s.unreadNotifs);
  const conversations = useSocialStore((s) => s.conversations);
  const unreadChats = conversations.reduce((a, c) => a + c.unreadCount, 0);

  const [showFriends, setShowFriends] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [dailyAvailable, setDailyAvailable] = useState(false);

  useEffect(() => {
    fetchDailyStatus()
      .then((r) => setDailyAvailable(r.canClaim))
      .catch(() => {});
    const iv = setInterval(() => {
      fetchDailyStatus().then((r) => setDailyAvailable(r.canClaim)).catch(() => {});
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  const hearts = me?.hearts ?? 0;
  const coins = me?.coins ?? 0;
  const gems = me?.gems ?? 0;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-bg-800/90 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ rotate: -10, opacity: 0, x: -10 }}
            animate={{ rotate: 0, opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-2xl"
          >
            🍾
          </motion.div>
          <h1 className="text-white text-lg font-bold tracking-wide hidden sm:block">Целуй и Знакомься</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFriends(true)}
            className="relative w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-base active:scale-90 transition"
          >
            💬
            {unreadChats > 0 && <Badge n={unreadChats} color="bg-accent-pink" />}
          </button>
          <button
            onClick={() => setShowNotifs(true)}
            className="relative w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-base active:scale-90 transition"
          >
            {dailyAvailable ? '🎁' : '🔔'}
            {(unreadNotifs > 0 || dailyAvailable) && (
              <Badge n={unreadNotifs + (dailyAvailable ? 1 : 0)} color={dailyAvailable ? 'bg-lime' : 'bg-accent-orange'} />
            )}
          </button>

          <Currency icon="❤️" value={hearts} color="text-heart" />
          <Currency icon="🪙" value={coins} color="text-accent-gold" />
          <Currency icon="💎" value={gems} color="text-diamond" />

          <button
            onClick={closeApp}
            className="ml-1 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFriends && <FriendsScreen onClose={() => setShowFriends(false)} />}
        {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      </AnimatePresence>
    </>
  );
}

function Currency({ icon, value, color }: { icon: string; value: number; color: string }) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="currency-chip !py-1 !px-2 !gap-1"
    >
      <span className={`text-base ${color}`}>{icon}</span>
      <span className="font-bold text-sm">{value}</span>
    </motion.div>
  );
}

function Badge({ n, color }: { n: number; color: string }) {
  return (
    <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full ${color} text-white text-[9px] font-bold flex items-center justify-center`}>
      {n > 9 ? '9+' : n}
    </span>
  );
}
