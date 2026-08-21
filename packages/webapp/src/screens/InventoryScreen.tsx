import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { hapticSelect } from '../utils/telegram';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { getFrameImageUrl, getFrameScaleClass, handleFrameError } from '../utils/frameUtils';
import { getBottleImageUrl, handleBottleError } from '../utils/bottleUtils';

interface InventoryItem {
  bottles: Array<{ id: string; name: string; imageUrl: string; acquiredAt: string }>;
  frames: Array<{ id: string; name: string; imageUrl: string; acquiredAt: string }>;
  boosters: Array<{ id: string; name: string; quantity: number; description: string }>;
}

export default function InventoryScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'bottles' | 'frames' | 'boosters'>('bottles');
  const [inv, setInv] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const me = useAuthStore((s) => s.user);
  const setMe = useUserStore((s) => s.setMe);

  useEffect(() => {
    api<{ ok: true; inventory: InventoryItem }>('/shop/inventory')
      .then((r) => r.ok && setInv(r.inventory))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const equipBottle = async (id: string) => {
    hapticSelect();
    await api(`/shop/equip-bottle/${id}`, { method: 'POST' });
    const fresh = await api<{ ok: boolean; user?: any }>('/users/me');
    if (fresh.user) {
      setMe(fresh.user);
      useAuthStore.setState({ user: fresh.user });
      try { localStorage.setItem('spinthe:user', JSON.stringify(fresh.user)); } catch {}
    }
  };

  const equipFrame = async (id: string | null) => {
    hapticSelect();
    await api(`/shop/equip-frame/${id || 'none'}`, { method: 'POST' });
    const fresh = await api<{ ok: boolean; user?: any }>('/users/me');
    if (fresh.user) {
      setMe(fresh.user);
      useAuthStore.setState({ user: fresh.user });
      try { localStorage.setItem('spinthe:user', JSON.stringify(fresh.user)); } catch {}
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-bg-900 flex flex-col"
    >
      <div className="h-14 bg-bg-800/95 border-b border-white/10 flex items-center px-4 gap-3 flex-shrink-0">
        <button onClick={onClose} className="text-white/70">‹ Закрыть</button>
        <h1 className="text-white text-lg font-bold flex-1">🎒 Инвентарь</h1>
      </div>

      <div className="flex gap-1 p-2 bg-bg-800/60">
        {([
          { k: 'bottles' as const, l: '🍾 Бутылочки' },
          { k: 'frames' as const, l: '🖼️ Рамки' },
          { k: 'boosters' as const, l: '⚡ Бустеры' },
        ]).map((t) => (
          <button
            key={t.k}
            onClick={() => { setTab(t.k); hapticSelect(); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === t.k ? 'bg-lime text-bg-900' : 'bg-white/10 text-white/70'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && <div className="text-white/50 text-center py-10">Загрузка…</div>}

        {!loading && tab === 'bottles' && (
          <div className="grid grid-cols-3 gap-3">
            <BottleCard
              id="green"
              name="Классическая"
              emoji="🍾"
              owned={true}
              equipped={me?.activeBottleId === 'classic_green' || me?.activeBottleId === 'green'}
              onEquip={() => equipBottle('classic_green')}
            />
            {inv?.bottles.map((b) => (
              <BottleCard
                key={b.id}
                id={b.id}
                name={b.name}
                imageUrl={b.imageUrl}
                emoji="🍾"
                owned={true}
                equipped={me?.activeBottleId === b.id}
                onEquip={() => equipBottle(b.id)}
              />
            ))}
          </div>
        )}

        {!loading && tab === 'frames' && (
          <div className="grid grid-cols-3 gap-3">
            <FrameCard
              id={null}
              name="Без рамки"
              emoji="⬜"
              equipped={!me?.activeFrameId}
              onEquip={() => equipFrame(null)}
            />
            {inv?.frames.map((f) => (
              <FrameCard
                key={f.id}
                id={f.id}
                name={f.name}
                emoji="🖼️"
                equipped={me?.activeFrameId === f.id}
                onEquip={() => equipFrame(f.id)}
              />
            ))}
          </div>
        )}

        {!loading && tab === 'boosters' && (
          <div className="space-y-2">
            {(inv?.boosters.length === 0) && (
              <div className="text-white/50 text-center py-10">У тебя пока нет бустеров</div>
            )}
            {inv?.boosters.map((b) => (
              <div key={b.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                <div className="text-4xl">⚡</div>
                <div className="flex-1">
                  <div className="text-white font-bold">{b.name}</div>
                  <div className="text-white/60 text-xs">{b.description}</div>
                </div>
                <div className="text-lime font-black text-xl">×{b.quantity}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BottleCard({ id, name, emoji, imageUrl, equipped, onEquip }: { id: string; name: string; emoji?: string; imageUrl?: string; owned: boolean; equipped: boolean; onEquip: () => void }) {
  const imgSrc = imageUrl || getBottleImageUrl(id);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onEquip}
      className={`glass rounded-2xl p-4 flex flex-col items-center gap-2 ${equipped ? 'ring-2 ring-lime' : ''}`}
    >
      <div className="w-14 h-14 relative flex items-center justify-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="w-full h-full object-contain pointer-events-none"
            onError={handleBottleError}
          />
        ) : (
          <div className="text-4xl">{emoji || '🍾'}</div>
        )}
      </div>
      <div className="text-white text-xs font-bold text-center">{name}</div>
      {equipped ? (
        <div className="text-lime text-[10px] font-bold">✓ Надето</div>
      ) : (
        <div className="text-white/50 text-[10px]">Надеть</div>
      )}
    </motion.button>
  );
}

function FrameCard({ id, name, emoji, equipped, onEquip }: { id: string | null; name: string; emoji: string; equipped: boolean; onEquip: () => void }) {
  const imageUrl = getFrameImageUrl(id);

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onEquip}
      className={`glass rounded-2xl p-4 flex flex-col items-center gap-2 ${equipped ? 'ring-2 ring-lime' : ''}`}
    >
      <div className="w-14 h-14 relative flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className={`w-full h-full object-contain pointer-events-none ${getFrameScaleClass(id)}`}
            onError={handleFrameError}
          />
        ) : (
          <div className="text-4xl">{emoji}</div>
        )}
      </div>
      <div className="text-white text-xs font-bold text-center">{name}</div>
      {equipped ? (
        <div className="text-lime text-[10px] font-bold">✓ Надето</div>
      ) : (
        <div className="text-white/50 text-[10px]">Надеть</div>
      )}
    </motion.button>
  );
}
