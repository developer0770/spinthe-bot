import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { PublicRoomDTO } from '@spinthe/shared';
import { useRoomSocket } from '../../hooks/useRoomSocket';
import { hapticImpact, hapticSelect } from '../../utils/telegram';

interface Props {
  onClose: () => void;
  onJoined: () => void;
}

export default function PublicRoomsModal({ onClose, onJoined }: Props) {
  const { fetchPublicRooms, joinById } = useRoomSocket();
  const [rooms, setRooms] = useState<PublicRoomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchPublicRooms()
      .then(({ rooms }) => setRooms(rooms))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchPublicRooms]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const handleJoin = async (id: number) => {
    hapticImpact('medium');
    setJoiningId(id);
    const res = await joinById(id);
    setJoiningId(null);
    if (res.ok) onJoined();
    else alert(res.error);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-2xl font-bold">🌐 Публичные столы</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { hapticSelect(); load(); }}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20"
            >
              ↻
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/80">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar -mx-1 px-1">
          {loading && rooms.length === 0 && (
            <div className="text-center text-white/60 py-12">Загрузка…</div>
          )}
          {!loading && rooms.length === 0 && !error && (
            <div className="text-center text-white/60 py-12">
              Пока нет открытых столов<br />
              <span className="text-white/40 text-sm">Создай свою игру!</span>
            </div>
          )}
          {error && (
            <div className="text-center text-danger py-12">Ошибка: {error}</div>
          )}

          <div className="flex flex-col gap-2">
            {rooms.map((r) => {
              const isFull = r.playersCount >= r.maxPlayers;
              const isPlaying = r.status === 'playing';
              const canJoin = !isFull && !isPlaying;
              const joining = joiningId === r.id;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-4 flex items-center gap-3 border transition ${
                    canJoin
                      ? 'bg-white/10 border-white/15 hover:bg-white/15 active:scale-[0.98] cursor-pointer'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                  onClick={() => canJoin && handleJoin(r.id)}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                      isPlaying
                        ? 'bg-gradient-to-br from-accent-pink to-red-600'
                        : isFull
                        ? 'bg-white/10'
                        : 'bg-gradient-to-br from-lime to-lime-dark'
                    }`}
                  >
                    {isPlaying ? '🎮' : isFull ? '🔒' : '🍾'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold truncate">{r.name || `Стол #${r.tableNumber}`}</div>
                    <div className="text-white/60 text-xs flex items-center gap-2">
                      <span>👤 {r.hostName}</span>
                      <span>•</span>
                      <span className={isPlaying ? 'text-accent-pink' : 'text-lime'}>
                        {isPlaying ? 'В игре' : 'Ожидание'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-white font-bold">
                      {r.playersCount}/{r.maxPlayers}
                    </div>
                    {joining ? (
                      <div className="text-lime text-xs">Входим…</div>
                    ) : canJoin ? (
                      <div className="text-lime text-xs">Войти →</div>
                    ) : isFull ? (
                      <div className="text-white/40 text-xs">Полный</div>
                    ) : (
                      <div className="text-white/40 text-xs">Играют</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
