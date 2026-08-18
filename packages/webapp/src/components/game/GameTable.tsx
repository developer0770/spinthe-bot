import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Bottle3D from '../game3d/Bottle3D';
import ActionPanel from '../game3d/ActionPanel';
import ChatPanel from '../lobby/ChatPanel';
import TruthOrDareCard from '../game3d/TruthOrDareCard';
import KissOverlay from '../game3d/KissOverlay';
import GiftAnimation from '../gift/GiftAnimation';
import PlayerActionsModal from './PlayerActionsModal';
import { hapticImpact } from '../../utils/telegram';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomSocket } from '../../hooks/useRoomSocket';
import { useEconomyStore } from '../../store/economyStore';
import { getFrameImageUrl, handleFrameError } from '../../utils/frameUtils';

interface Props {
  onLeave?: () => void;
}

/**
 * Основной экран игры: 3D-бутылочка по центру, игроки расставлены по овалу,
 * чат внизу, панель действий (Крутить / Поцеловать / Отказать / Готово).
 * Вся логика синхронизирована через Socket.IO.
 */
export default function GameTable({ onLeave }: Props) {
  const table = useRoomStore((s) => s.table);
  const players = useRoomStore((s) => s.players);
  const game = useRoomStore((s) => s.game);
  const gamePhase = useRoomStore((s) => s.gamePhase);
  const spinnerId = useRoomStore((s) => s.currentSpinnerId);
  const targetId = useRoomStore((s) => s.currentTargetId);
  const bottleRotation = useRoomStore((s) => s.bottleRotation);
  const isSpinning = useRoomStore((s) => s.isSpinning);
  const card = useRoomStore((s) => s.card);
  const choiceDeadline = useRoomStore((s) => s.choiceDeadlineAt);
  const kiss = useRoomStore((s) => s.kissCelebration);
  const playerConn = useRoomStore((s) => s.playerConn);

  const me = useAuthStore((s) => s.user);
  const { leave, spin, kiss: sendKiss, reject: sendReject, ready } = useRoomSocket();
  const [showKiss, setShowKiss] = useState<{ from: string; to: string } | null>(null);
  const flyGifts = useEconomyStore((s) => s.flyGifts);
  const removeFlyGift = useEconomyStore((s) => s.removeFlyGift);
  const [actionsFor, setActionsFor] = useState<{ userId: number; name: string; isMe: boolean } | null>(null);

  useEffect(() => {
    if (kiss) {
      const from = players.find((p) => p.userId === kiss.fromId)?.user.name || 'Игрок';
      const to = players.find((p) => p.userId === kiss.toId)?.user.name || 'Игрок';
      hapticImpact('heavy');
      setShowKiss({ from, to });
    }
  }, [kiss, players]);

  useEffect(() => {
    if (!table && onLeave) onLeave();
  }, [table, onLeave]);

  if (!table) return null;

  const maxP = table.maxPlayers;
  const step = game?.currentStep ?? 0;
  const totalSteps = game?.totalSteps ?? table.totalRounds;

  const spinner = players.find((p) => p.userId === spinnerId);
  const target = players.find((p) => p.userId === targetId);
  const isMyTurn = spinnerId === me?.id;
  const canSpin = gamePhase === 'awaiting_spin' && isMyTurn;
  const isChoosing = gamePhase === 'choosing';
  const isCardShown = gamePhase === 'truth_dare' && !!card;

  // Геометрия стола
  const W = 360;
  const H = 480;
  const cx = W / 2;
  const cy = H / 2 - 10;
  const rx = maxP <= 6 ? 125 : 140;
  const ry = maxP <= 6 ? 175 : 195;

  const slots = useMemo(() => Array.from({ length: maxP }, (_, i) => i), [maxP]);

  const handleLeave = async () => {
    await leave();
    onLeave?.();
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-900">
      {/* Хедер */}
      <div className="fixed top-0 left-0 right-0 z-30 h-14 bg-bg-800/90 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4">
        <button onClick={handleLeave} className="text-white/70 text-sm flex items-center gap-1 active:scale-95">
          ‹ Выйти
        </button>
        <h1 className="text-white text-[17px] font-bold truncate max-w-[50%]">
          {table.name || `Стол #${table.tableNumber}`}
        </h1>
        <div className="text-white/70 text-sm font-bold">
          {step}/{totalSteps}
        </div>
      </div>

      <div className="flex-1 pt-14 pb-[300px] relative overflow-hidden">
        <div className="absolute inset-x-0 top-14 bottom-0 wood-bg">
          {/* Чей ход */}
          <div className="pt-3 text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-1.5 rounded-full border border-white/20">
              {isSpinning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-accent-orange animate-pulse" />
                  <span className="text-white font-semibold text-sm">Бутылочка крутится… 🌀</span>
                </>
              ) : spinner ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-accent-pink animate-pulse" />
                  <span className="text-white font-semibold text-sm">
                    Ход: <span className="text-lime">{spinner.user.name}</span>
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto mt-2" style={{ width: W, height: H }}>
            {/* Деревянный стол */}
            <div
              className="absolute rounded-full"
              style={{
                left: cx - rx - 14,
                top: cy - ry - 14,
                width: rx * 2 + 28,
                height: ry * 2 + 28,
                background:
                  'radial-gradient(ellipse at center, rgba(120,70,20,.5) 0%, rgba(80,45,10,.7) 60%, rgba(60,30,5,.85) 100%)',
                boxShadow: 'inset 0 0 80px rgba(0,0,0,.5), 0 15px 40px rgba(0,0,0,.5)',
                border: '4px solid rgba(50,25,5,.8)',
              }}
            />

            {/* Блики на столе */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: cx - rx + 20,
                top: cy - ry + 20,
                width: rx,
                height: ry / 2,
                background: 'radial-gradient(ellipse at center, rgba(255,220,150,.18) 0%, transparent 70%)',
              }}
            />

            {/* Слоты игроков */}
            {slots.map((i) => {
              const angle = (i / maxP) * Math.PI * 2 - Math.PI / 2;
              const x = cx + rx * Math.cos(angle);
              const y = cy + ry * Math.sin(angle);
              const p = players.find((pl) => pl.slotIndex === i);
              if (!p) return (
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
                  <div className="w-14 h-14 rounded-xl border-2 border-dashed border-white/15 bg-black/20" />
                </div>
              );
              const color =
                p.user.gender === 'female'
                  ? '#ec4899'
                  : p.user.gender === 'male'
                  ? '#3b82f6'
                  : '#94c92e';
              const isMe = p.userId === me?.id;
              const isSpinner = p.userId === spinnerId;
              const isTarget = p.userId === targetId;
              const initial = p.user.name?.[0]?.toUpperCase() || '?';
              const displayName = isMe ? 'Ты' : p.user.name.length > 8 ? p.user.name.slice(0, 7) + '…' : p.user.name;
              return (
                <motion.div
                  key={p.userId}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: isTarget ? 1.25 : isSpinner ? 1.1 : 1,
                    opacity: 1,
                  }}
                  transition={{ type: 'spring' }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                  style={{ left: x, top: y }}
                >
                  <div
                    onClick={() => {
                      hapticImpact('light');
                      setActionsFor({ userId: p.userId, name: p.user.name, isMe: isMe });
                    }}
                    className={`w-14 h-14 rounded-xl shadow-lg flex items-center justify-center text-xl font-bold text-white relative cursor-pointer active:scale-95 ${
                      isMe ? 'ring-2 ring-lime' : ''
                    } ${isSpinner ? 'ring-4 ring-accent-orange shadow-glow-orange' : ''} ${
                      isTarget ? 'ring-4 ring-pink-400 animate-pulse' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center relative">
                      {p.user.avatarUrl ? (
                        <img
                          src={p.user.avatarUrl}
                          alt={p.user.name}
                          className="w-full h-full object-cover"
                          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                        />
                      ) : (
                        initial
                      )}
                    </div>
                    {/* Рамка */}
                    {p.user.activeFrameId && (
                      <img
                        src={getFrameImageUrl(p.user.activeFrameId) || ''}
                        alt="frame"
                        className="absolute inset-0 w-full h-full pointer-events-none z-10 object-contain scale-105"
                        onError={handleFrameError}
                      />
                    )}
                    {p.isHost && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg z-20">👑</div>
                    )}
                    {playerConn[p.userId] === 'reconnecting' && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-xl">
                        <div className="text-orange-400 text-lg animate-spin">⟳</div>
                      </div>
                    )}
                    {playerConn[p.userId] === 'online' && !isMe && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime border-2 border-[#14202e]" />
                    )}
                    {p.user.kissesCount > 0 && (
                      <span className="kisses-badge">
                        {p.user.kissesCount > 99 ? '99+' : p.user.kissesCount}
                      </span>
                    )}
                  </div>
                  <span className="text-white text-[11px] mt-1 whitespace-nowrap font-semibold shadow-text">
                    {displayName}
                  </span>
                </motion.div>
              );
            })}

            {/* Стрелка-указатель сверху (куда смотрит горлышко) */}
            <div
              className="absolute -translate-x-1/2 text-pink-400 text-3xl z-20 drop-shadow-lg pointer-events-none"
              style={{ left: cx, top: cy - ry - 36 }}
            >
              ▼
            </div>

            {/* 3D Бутылочка */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 select-none flex flex-col items-center justify-center"
              style={{ left: cx, top: cy }}
            >
              <div
                onClick={() => {
                  if (canSpin) {
                    hapticImpact('medium');
                    spin();
                  }
                }}
                className={canSpin ? 'cursor-pointer active:scale-95 transition' : ''}
                style={{ filter: isSpinning ? 'drop-shadow(0 0 20px rgba(255,152,0,.6))' : 'drop-shadow(0 8px 20px rgba(0,0,0,.5))' }}
              >
                <Bottle3D
                  rotation={bottleRotation}
                  spinning={isSpinning}
                  size={250}
                  skinId={me?.activeBottleId}
                  onClick={() => {
                    if (canSpin) {
                      hapticImpact('medium');
                      spin();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Чат и панель действий */}
      <div className="fixed bottom-10 left-0 right-0 z-30">
        <ChatPanel />
        <div className="px-4 pb-3 pt-2 bg-gradient-to-t from-bg-900 to-transparent">
          <ActionPanel
            onSpin={spin}
            onKiss={sendKiss}
            onReject={sendReject}
            onReady={ready}
            canSpin={canSpin}
            isChoosing={isChoosing}
            isMyTurn={isMyTurn}
            isCardShown={isCardShown}
            targetName={target?.user.name}
            targetGender={target?.user.gender}
            deadlineAt={isChoosing ? choiceDeadline : isCardShown ? card?.deadlineAt : null}
            spinning={isSpinning}
          />
        </div>
      </div>

      {/* Карточка Правда/Действие */}
      <AnimatePresence>
        {isCardShown && card && target && (
          <TruthOrDareCard
            type={card.type}
            text={card.text}
            deadlineAt={card.deadlineAt}
            targetName={target.user.name}
          />
        )}
      </AnimatePresence>

      {/* Оверлей поцелуя */}
      <AnimatePresence>
        {showKiss && (
          <KissOverlay
            fromName={showKiss.from}
            toName={showKiss.to}
            onDone={() => setShowKiss(null)}
          />
        )}
      </AnimatePresence>

      {/* Анимации подарков */}
      <AnimatePresence>
        {flyGifts.map((g) => {
          const from = players.find((p) => p.userId === g.fromId)?.user.name || 'Игрок';
          const to = players.find((p) => p.userId === g.toId)?.user.name || 'Игрок';
          return (
            <GiftAnimation
              key={g.id}
              emoji={g.emoji}
              fromName={from}
              toName={to}
              giftName={g.name}
              onDone={() => removeFlyGift(g.id)}
            />
          );
        })}
      </AnimatePresence>

      {/* Действия с игроком (подарить / пожаловаться) */}
      <PlayerActionsModal
        open={!!actionsFor}
        userId={actionsFor?.userId}
        userName={actionsFor?.name}
        isMe={actionsFor?.isMe}
        tableId={table.id}
        onClose={() => setActionsFor(null)}
      />

      <div className="fixed bottom-0 left-0 right-0 h-10 bg-bg-800 flex items-center justify-center text-white/50 text-sm z-40">
        @spinthe_bot  •  Код: {table.roomCode}
      </div>
    </div>
  );
}
