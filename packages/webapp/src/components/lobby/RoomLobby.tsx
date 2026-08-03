import { useEffect, useState } from 'react';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomSocket } from '../../hooks/useRoomSocket';
import { hapticImpact, hapticSelect, shareInvite } from '../../utils/telegram';
import PlayerSlot from './PlayerSlot';
import ChatPanel from './ChatPanel';

interface Props {
  onLeave: () => void;
  onStart: () => void;
}

/**
 * Лобби комнаты — список игроков вокруг стола, код комнаты,
 * кнопка «Пригласить», для хоста — «Начать игру».
 */
export default function RoomLobby({ onLeave, onStart }: Props) {
  const table = useRoomStore((s) => s.table);
  const players = useRoomStore((s) => s.players);
  const playerConn = useRoomStore((s) => s.playerConn);
  const myId = useAuthStore((s) => s.user?.id);
  const { leave, kickPlayer, startGame } = useRoomSocket();
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!table) onLeave();
  }, [table, onLeave]);

  if (!table) return null;
  const isHost = table.hostId === myId;
  const slots: (typeof players[number] | null)[] = Array.from({ length: table.maxPlayers }, (_, i) => {
    return players.find((p) => p.slotIndex === i) || null;
  });
  const canStart = players.length >= 2;

  const handleLeave = async () => {
    hapticImpact('light');
    await leave();
    onLeave();
  };

  const handleCopyCode = async () => {
    hapticSelect();
    const url = `https://t.me/share/url?url=t.me/spinthe_bot?start=room_${table.roomCode}&text=Присоединяйся к моей комнате в «Целуй и Знакомься»! Код: ${table.roomCode}`;
    try {
      await navigator.clipboard.writeText(table.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
    shareInvite(table.roomCode);
    window.open(url, '_blank');
  };

  const handleStart = async () => {
    if (!canStart || starting) return;
    hapticImpact('medium');
    setStarting(true);
    const res = await startGame();
    if (!res.ok) {
      setStarting(false);
      alert(res.error);
      return;
    }
    setStarting(false);
    onStart();
  };

  const handleKick = async (userId: number) => {
    if (!isHost || userId === myId) return;
    hapticImpact('light');
    await kickPlayer(userId);
  };

  const W = 360;
  const H = 440;
  const cx = W / 2;
  const cy = H / 2 + 10;
  // Радиус зависит от числа игроков
  const rx = table.maxPlayers <= 6 ? 120 : 140;
  const ry = table.maxPlayers <= 6 ? 160 : 185;

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-900">
      {/* Хедер */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-bg-800/95 backdrop-blur-lg border-b border-white/10 flex items-center justify-between px-4">
        <button onClick={handleLeave} className="text-white/70 text-sm flex items-center gap-1 active:scale-95 transition">
          ‹ Выйти
        </button>
        <h1 className="text-white text-[17px] font-bold truncate max-w-[50%]">
          {table.name || `Стол #${table.tableNumber}`}
        </h1>
        <div className="text-white/70 text-sm">
          {players.length}/{table.maxPlayers}
        </div>
      </div>

      <div className="flex-1 pt-14 pb-44 relative overflow-hidden">
        <div className="wood-bg absolute inset-x-0 top-14 bottom-0">
          {/* Код комнаты + пригласить */}
          <div className="pt-3 px-4 flex items-center justify-between gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur rounded-xl px-4 py-2 flex items-center justify-between border border-white/15">
              <div>
                <div className="text-white/60 text-[11px] uppercase tracking-wider">Код комнаты</div>
                <div className="text-white text-xl font-bold tracking-widest font-mono">{table.roomCode}</div>
              </div>
              <button
                onClick={handleCopyCode}
                className="bg-lime text-bg-900 px-3 py-1.5 rounded-lg text-sm font-bold active:scale-95 transition shadow-glow"
              >
                {copied ? '✓' : 'Пригласить'}
              </button>
            </div>
            {table.isPrivate && (
              <div className="bg-accent-blue/20 border border-accent-blue/50 rounded-xl px-3 py-2 text-center">
                <div className="text-xl">🔒</div>
                <div className="text-accent-blue text-[10px] font-bold">PRIVATE</div>
              </div>
            )}
          </div>

          {/* Заголовок-статус */}
          <div className="text-center mt-4 mb-2">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-1.5 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
              <span className="text-white font-semibold text-sm">Ожидание игроков…</span>
            </div>
          </div>

          {/* Круг игроков */}
          <div className="relative mx-auto mt-4" style={{ width: W, height: H }}>
            <div
              className="absolute rounded-full border-4 border-white/10 bg-black/10"
              style={{
                left: cx - rx - 10,
                top: cy - ry - 10,
                width: rx * 2 + 20,
                height: ry * 2 + 20,
              }}
            />
            {/* Центральная бутылочка/логотип */}
            <div
              onClick={() => {
                if (canStart && isHost) handleStart();
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none ${
                canStart && isHost ? 'cursor-pointer active:scale-95 transition' : ''
              }`}
              style={{ left: cx, top: cy }}
            >
              <div className={`text-6xl mb-1 ${canStart ? 'animate-bounce' : 'animate-bounce-arrow'}`}>🍾</div>
              <div className="text-white text-center font-bold text-lg shadow-text">Лобби</div>
              <div className="text-white/70 text-xs shadow-text">{table.totalRounds} раундов</div>
              {canStart && (
                <div className="mt-2 px-3 py-1 bg-lime text-bg-900 font-bold text-xs rounded-full shadow-glow animate-pulse whitespace-nowrap">
                  {isHost ? 'Нажми на бутылочку, чтобы начать! 🍾' : 'Ждём, пока хост нажмёт 🍾'}
                </div>
              )}
            </div>

            {slots.map((p, i) => {
              const angle = (i / table.maxPlayers) * Math.PI * 2 - Math.PI / 2;
              const x = cx + rx * Math.cos(angle);
              const y = cy + ry * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: x, top: y }}
                >
                  <PlayerSlot
                    slot={p}
                    isMe={p?.userId === myId}
                    isHost={p?.userId === table.hostId}
                    canKick={isHost && !!p && p.userId !== myId}
                    onKick={() => p && handleKick(p.userId)}
                    connStatus={p ? (playerConn[p.userId] || 'online') : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Чат и кнопка старта/готовности */}
      <div className="fixed bottom-14 left-0 right-0 z-30">
        <ChatPanel />
        {!canStart && (
          <div className="px-4 pb-3 pt-2 bg-gradient-to-t from-bg-900 to-transparent">
            <div className="w-full py-4 rounded-2xl bg-white/10 text-white/40 text-center font-bold">
              Нужно минимум 2 игрока ({players.length}/2)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
