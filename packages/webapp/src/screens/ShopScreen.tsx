import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEconomyStore } from '../store/economyStore';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useSocialStore } from '../store/socialStore';
import { useRoomStore } from '../store/roomStore';
import { getFrameImageUrl, getFrameScaleClass, handleFrameError } from '../utils/frameUtils';
import {
  fetchHeartPacks,
  fetchGifts,
  fetchBottlesShop,
  fetchFramesShop,
  buyHeartsPack,
  buyVip,
  buyBottle,
  equipBottle,
  buyFrame,
  equipFrame,
  sendGift,
  claimDaily,
  fetchDailyStatus,
  GiftItem,
} from '../api/shop';
import { hapticImpact, hapticSelect, hapticNotif } from '../utils/telegram';
import DailyRewardModal from '../components/shop/DailyRewardModal';
import GiftConfirmModal from '../components/shop/GiftConfirmModal';
import GiftRecipientPicker, { RecipientCandidate } from '../components/shop/GiftRecipientPicker';
import GiftSentOverlay from '../components/shop/GiftSentOverlay';

type Tab = 'hearts' | 'gifts' | 'skins' | 'vip';

export default function ShopScreen() {
  const [tab, setTab] = useState<Tab>('hearts');
  const [skinTab, setSkinTab] = useState<'bottles' | 'frames'>('bottles');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [dailyReward, setDailyReward] = useState<{ hearts: number; coins: number; gems: number } | null>(null);
  const [giftConfirm, setGiftConfirm] = useState<{ gift: GiftItem; targetId: number; targetName: string } | null>(null);
  const [giftPickTarget, setGiftPickTarget] = useState<GiftItem | null>(null);
  const [giftSent, setGiftSent] = useState<{ gift: GiftItem; targetName: string } | null>(null);

  const friends = useSocialStore((s) => s.friends.filter((f) => f.status === 'friend'));
  const players = useRoomStore((s) => s.players);

  const store = useEconomyStore();
  const me = useAuthStore((s) => s.user);

  const friendCandidates: RecipientCandidate[] = useMemo(
    () => friends.map((f) => ({ userId: f.userId, name: f.name, avatarUrl: f.avatarUrl, gender: f.gender, meta: 'Друг' })),
    [friends],
  );
  const playerCandidates: RecipientCandidate[] = useMemo(
    () =>
      players.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        gender: p.user.gender,
        meta: 'В комнате',
      })),
    [players],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [packs, gifts, bottles, frames, ds] = await Promise.all([
        fetchHeartPacks().catch(() => []),
        fetchGifts().catch(() => []),
        fetchBottlesShop().catch(() => []),
        fetchFramesShop().catch(() => []),
        fetchDailyStatus().catch(() => ({ canClaim: false, nextInMs: 0 })),
      ]);
      store.setHeartPacks(packs);
      store.setGifts(gifts);
      store.setBottles(bottles);
      store.setFrames(frames);
      store.setDaily(ds.canClaim, ds.nextInMs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClaimDaily = async () => {
    hapticImpact('medium');
    setAction('daily');
    try {
      const r = await claimDaily();
      setDailyReward(r.reward);
      useAuthStore.setState({ user: r.me });
      useUserStore.getState().setMe(r.me);
      hapticNotif('success');
    } catch (e: any) {
      hapticNotif('error');
      alert(e.message || 'Не удалось получить награду');
    } finally {
      setAction(null);
    }
  };

  const handleBuyPack = async (id: string) => {
    hapticImpact('medium');
    setAction(id);
    try {
      const r = await buyHeartsPack(id);
      store.refreshMe();
      hapticNotif('success');
      alert(`+${r.hearts} ❤️ начислено!`);
    } catch (e: any) {
      hapticNotif('error');
      alert(e.message);
    } finally {
      setAction(null);
    }
  };

  const handleBuyVip = async () => {
    hapticImpact('medium');
    setAction('vip');
    try {
      await buyVip(30);
      store.refreshMe();
      hapticNotif('success');
      alert('VIP активирован на 30 дней! 👑');
    } catch (e: any) {
      hapticNotif('error');
      alert(e.message);
    } finally {
      setAction(null);
    }
  };

  const handleBuyBottle = async (id: string) => {
    hapticImpact('medium');
    setAction('b' + id);
    try {
      await buyBottle(id);
      store.incrementOwned('bottle', id);
      hapticNotif('success');
    } catch (e: any) {
      hapticNotif('error');
      alert(e.message);
    } finally {
      setAction(null);
    }
  };

  const handleEquipBottle = async (id: string) => {
    hapticSelect();
    try {
      await equipBottle(id);
      store.refreshMe();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBuyFrame = async (id: string) => {
    hapticImpact('medium');
    setAction('f' + id);
    try {
      await buyFrame(id);
      store.incrementOwned('frame', id);
      hapticNotif('success');
    } catch (e: any) {
      hapticNotif('error');
      alert(e.message);
    } finally {
      setAction(null);
    }
  };

  const handleEquipFrame = async (id: string) => {
    hapticSelect();
    try {
      await equipFrame(id);
      store.refreshMe();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handlePickRecipient = (userId: number, name: string) => {
    if (!giftPickTarget) return;
    hapticSelect();
    setGiftConfirm({ gift: giftPickTarget, targetId: userId, targetName: name });
    setGiftPickTarget(null);
  };

  const handleSendGift = async (gift: GiftItem, targetId: number) => {
    hapticImpact('medium');
    setAction('g' + gift.id);
    const currentTableId = useRoomStore.getState().table?.id;
    try {
      await sendGift(targetId, gift.id, currentTableId);
      await store.refreshMe();
      const targetName = giftConfirm?.targetName || 'Игрок';
      setGiftConfirm(null);
      setGiftSent({ gift, targetName });
      hapticNotif('success');
    } catch (e: any) {
      hapticNotif('error');
      alert(e.message || 'Не удалось отправить подарок');
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar pt-16 pb-24 px-4">
      <motion.h2 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-white text-3xl font-bold mb-4">
        Магазин 🛍️
      </motion.h2>

      {/* Дейли-баннер */}
      {store.canClaimDaily && (
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleClaimDaily}
          disabled={action === 'daily'}
          className="w-full mb-4 rounded-2xl p-4 bg-gradient-to-r from-amber-400 to-orange-500 flex items-center gap-3 shadow-lg"
        >
          <div className="text-4xl animate-bounce-arrow">🎁</div>
          <div className="flex-1 text-left">
            <div className="text-white font-black text-lg">Ежедневная награда!</div>
            <div className="text-white/90 text-sm">Забери бесплатные сердечки и монеты</div>
          </div>
          <div className="text-white font-black bg-white/20 backdrop-blur px-4 py-2 rounded-xl">
            {action === 'daily' ? '…' : 'Забрать →'}
          </div>
        </motion.button>
      )}

      {/* Баланс */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 glass rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="text-xl">❤️</span>
          <span className="text-white font-black">{me?.hearts ?? 0}</span>
        </div>
        <div className="flex-1 glass rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="text-xl">🪙</span>
          <span className="text-white font-black">{me?.coins ?? 0}</span>
        </div>
        <div className="flex-1 glass rounded-2xl px-3 py-2 flex items-center gap-2">
          <span className="text-xl">💎</span>
          <span className="text-white font-black">{me?.gems ?? 0}</span>
        </div>
      </div>

      {/* Табы */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {([
          { k: 'hearts', l: '❤️', n: 'Сердечки' },
          { k: 'gifts', l: '🎁', n: 'Подарки' },
          { k: 'skins', l: '🎨', n: 'Скины' },
          { k: 'vip', l: '👑', n: 'VIP' },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => { setTab(t.k); hapticSelect(); }}
            className={`py-2 rounded-xl font-bold text-sm transition ${
              tab === t.k ? 'bg-lime text-bg-900 shadow-glow' : 'bg-white/10 text-white/80'
            }`}
          >
            <div className="text-xl">{t.l}</div>
            <div>{t.n}</div>
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-white/60 py-10">Загрузка…</div>}

      {/* Вкладка: Сердечки */}
      {tab === 'hearts' && !loading && (
        <div className="grid grid-cols-2 gap-3">
          {store.heartPacks.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBuyPack(p.id)}
              disabled={action === p.id}
              className={`relative rounded-2xl p-4 text-center bg-gradient-to-br from-heart via-pink-500 to-rose-600 text-white shadow-lg ${
                p.best ? 'ring-2 ring-accent-gold col-span-2' : ''
              }`}
            >
              {p.best && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent-gold text-bg-900 text-xs font-black px-3 py-0.5 rounded-full">
                  ВЫГОДНО
                </div>
              )}
              <div className="text-4xl mb-1">❤️</div>
              <div className="font-black text-lg">{p.label}</div>
              {p.bonus > 0 && <div className="text-yellow-200 text-xs">+{p.bonus} бонус</div>}
              <div className="mt-2 inline-flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full font-bold text-sm">
                ⭐ {p.stars}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Вкладка: Подарки */}
      {tab === 'gifts' && !loading && (
        <div className="grid grid-cols-4 gap-2">
          {store.gifts.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { hapticSelect(); setGiftPickTarget(g); }}
              className="glass rounded-2xl p-2 flex flex-col items-center active:bg-white/20"
            >
              <div className="text-4xl mb-1">{g.emoji}</div>
              <div className="text-white text-xs font-bold truncate w-full text-center">{g.name}</div>
              <div className="text-heart text-xs font-bold">❤️ {g.priceHearts}</div>
            </motion.button>
          ))}
          <div className="col-span-4 text-white/50 text-center text-xs mt-2">
            Выбери подарок и отправь другу или игроку из комнаты. Дарить можно и прямо за столом — кликни по аватару.
          </div>
        </div>
      )}

      {/* Вкладка: Скины */}
      {tab === 'skins' && !loading && (
        <div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSkinTab('bottles')}
              className={`flex-1 py-2 rounded-xl font-bold ${skinTab === 'bottles' ? 'bg-lime text-bg-900' : 'bg-white/10 text-white'}`}
            >
              🍾 Бутылочки
            </button>
            <button
              onClick={() => setSkinTab('frames')}
              className={`flex-1 py-2 rounded-xl font-bold ${skinTab === 'frames' ? 'bg-lime text-bg-900' : 'bg-white/10 text-white'}`}
            >
              🖼️ Рамки
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {skinTab === 'bottles' && store.bottles.map((b, i) => (
              <SkinCard
                key={b.id}
                i={i}
                emoji="🍾"
                name={b.name}
                price={b.priceHearts}
                owned={b.owned}
                isEquipped={me?.activeBottleId === b.id}
                buying={action === 'b' + b.id}
                onBuy={() => handleBuyBottle(b.id)}
                onEquip={() => handleEquipBottle(b.id)}
              />
            ))}
            {skinTab === 'frames' && store.frames.map((f, i) => (
              <SkinCard
                key={f.id}
                id={f.id}
                i={i}
                imageUrl={f.imageUrl || getFrameImageUrl(f.id)}
                name={f.name}
                price={f.priceHearts}
                owned={f.owned}
                isEquipped={me?.activeFrameId === f.id}
                buying={action === 'f' + f.id}
                onBuy={() => handleBuyFrame(f.id)}
                onEquip={() => handleEquipFrame(f.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Вкладка: VIP */}
      {tab === 'vip' && !loading && (
        <div className="flex flex-col gap-3">
          <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-center shadow-glow relative overflow-hidden">
            <div className="absolute -top-8 -right-8 text-9xl opacity-30">👑</div>
            <div className="text-6xl mb-2 animate-float">👑</div>
            <h3 className="text-white text-3xl font-black mb-1">VIP-статус</h3>
            <p className="text-white/90 mb-4">Безлимитные подарки, уникальные рамки, выделение имени и бонусы</p>
            <ul className="text-left text-white/95 text-sm mb-5 space-y-1">
              <li>✨ Золотая рамка аватара и корона</li>
              <li>💬 Расширенный чат и эксклюзивные стикеры</li>
              <li>🎁 Ежедневный VIP-бонус (+100 ❤️, х2 монеты, шанс 💎)</li>
              <li>💎 Скидка 20% на все подарки в магазине</li>
            </ul>
            <button
              onClick={handleBuyVip}
              disabled={action === 'vip' || !!me?.isVip}
              className="w-full py-4 rounded-2xl bg-white text-amber-700 font-black text-lg shadow active:scale-95 transition disabled:opacity-60"
            >
              {me?.isVip ? '✓ VIP активен' : 'Купить за 500 ❤️ (30 дней)'}
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {dailyReward && (
          <DailyRewardModal reward={dailyReward} onClose={() => setDailyReward(null)} />
        )}
        {giftPickTarget && (
          <GiftRecipientPicker
            gift={giftPickTarget}
            friends={friendCandidates}
            roomPlayers={playerCandidates}
            onPick={handlePickRecipient}
            onClose={() => setGiftPickTarget(null)}
          />
        )}
        {giftConfirm && (
          <GiftConfirmModal
            gift={giftConfirm.gift}
            targetName={giftConfirm.targetName}
            onCancel={() => setGiftConfirm(null)}
            onConfirm={() => handleSendGift(giftConfirm.gift, giftConfirm.targetId)}
            loading={action === 'g' + giftConfirm.gift.id}
          />
        )}
        {giftSent && (
          <GiftSentOverlay
            gift={giftSent.gift}
            targetName={giftSent.targetName}
            onDone={() => setGiftSent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SkinCard({
  id, i, emoji, imageUrl, name, price, owned, isEquipped, buying, onBuy, onEquip,
}: {
  id?: string;
  i: number;
  emoji?: string;
  imageUrl?: string | null;
  name: string;
  price: number | null;
  owned: boolean;
  isEquipped: boolean;
  buying: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.04 }}
      className="glass rounded-2xl p-3 flex flex-col items-center"
    >
      <div className={`w-16 h-16 relative flex items-center justify-center my-2 ${isEquipped ? 'animate-bounce-arrow' : ''}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className={`w-full h-full object-contain pointer-events-none ${getFrameScaleClass(id)}`}
            onError={handleFrameError}
          />
        ) : (
          <div className="text-5xl">{emoji || '🖼️'}</div>
        )}
      </div>
      <div className="text-white text-xs font-bold text-center mb-1">{name}</div>
      {owned ? (
        <button
          onClick={onEquip}
          disabled={isEquipped}
          className={`w-full py-1 rounded-lg text-xs font-bold ${
            isEquipped ? 'bg-lime/30 text-lime' : 'bg-white/10 text-white'
          }`}
        >
          {isEquipped ? '✓ Надето' : 'Надеть'}
        </button>
      ) : price == null ? (
        <div className="text-white/50 text-xs">Бесплатно</div>
      ) : (
        <button
          onClick={onBuy}
          disabled={buying}
          className="w-full py-1 rounded-lg bg-accent-orange text-white text-xs font-bold active:scale-95"
        >
          ❤️ {price}
        </button>
      )}
    </motion.div>
  );
}
