import { useEffect, useState } from 'react';
import { initTelegram, getTelegram, getTgUser } from '../utils/telegram';

export function useTelegram() {
  const [ready, setReady] = useState(false);
  const [tgUser, setTgUser] = useState<ReturnType<typeof getTgUser>>(null);

  useEffect(() => {
    const tg = initTelegram();
    setTgUser(getTgUser());
    setReady(true);

    try {
      tg.BackButton?.hide();
      tg.onEvent('viewportChanged', () => tg.expand());
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready, tgUser, tg: getTelegram() };
}
