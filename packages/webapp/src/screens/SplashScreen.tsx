import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore';
import { getMe } from '../api/client';
import AuthLoading from '../components/splash/AuthLoading';
import GameRoot from './GameRoot';
import ProfileSetup from '../components/onboarding/ProfileSetup';
import { consumePendingInvite, stashPendingInvite } from '../utils/deepLinks';
import type { UserDTO } from '@spinthe/shared';

/** Ключ — инвайт из стартап-параметра, который нужно применить после входа в игру. */
let pendingInvite: string | null = null;

/**
 * Сплэш «Целуй и Знакомься» — показывается ~2 сек,
 * затем либо онбординг (если профиль не заполнен), либо игровой рут.
 * На старте разбирает startapp=room_XXXX инвайт.
 */
export default function SplashScreen() {
  const [stage, setStage] = useState<'splash' | 'loading' | 'onboarding' | 'game'>('splash');
  const [err, setErr] = useState<string | null>(null);
  const setMe = useUserStore((s) => s.setMe);

  useEffect(() => {
    // Схватываем deep link на самом раннем этапе
    const code = consumePendingInvite();
    if (code) pendingInvite = code;
    const t = setTimeout(() => setStage('loading'), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (stage !== 'loading') return;
    getMe<UserDTO>()
      .then((user) => {
        setMe(user);
        if (user.gender && user.age) setStage('game');
        else {
          // Если пришли по инвайту, но профиль не заполнен — запомним код на потом
          if (pendingInvite) stashPendingInvite(pendingInvite);
          setStage('onboarding');
        }
      })
      .catch((e: Error) => {
        setErr(e.message);
      });
  }, [stage, setMe]);

  /** Применить отложенный инвайт: вызывается из GameRoot через window-событие. */
  useEffect(() => {
    (window as any).__spinthe_consumeInvite = () => {
      const c = pendingInvite;
      pendingInvite = null;
      return c;
    };
    return () => { delete (window as any).__spinthe_consumeInvite; };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {stage === 'splash' && (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 splash-pattern flex items-center justify-center flex-col z-50"
        >
          <div className="relative text-center">
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="embossed-orange text-[80px] leading-none"
            >
              Целуй
            </motion.div>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="embossed-orange text-[72px] leading-none -mt-3"
            >
              и Знакомься
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-4xl animate-float"
            >
              🍾💋❤️
            </motion.div>
          </div>
        </motion.div>
      )}

      {stage === 'loading' && !err && (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AuthLoading />
        </motion.div>
      )}

      {err && <AuthLoading error={err} />}

      {stage === 'onboarding' && (
        <ProfileSetup key="onb" onComplete={() => {
          // Обновляем пользователя и идём в игру
          getMe<UserDTO>().then(setMe);
          setStage('game');
        }} />
      )}

      {stage === 'game' && <GameRoot key="game" />}
    </AnimatePresence>
  );
}
