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

  // Keep store subscriptions so socialStore stays reactive
  useSocialStore((s) => s.unreadNotifs);
  useSocialStore((s) => s.conversations);

  const [showFriends] = useState(false);
  const [showNotifs] = useState(false);
  const [, setDailyAvailable] = useState(false);

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

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-bg-800/90 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-white text-lg font-bold tracking-wide">Целуй и Знакомься</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <Currency icon="❤️" value={hearts} color="text-heart" />

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
        {showFriends && <FriendsScreen onClose={() => {}} />}
        {showNotifs && <NotificationsPanel onClose={() => {}} />}
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
