import { useState } from 'react';
import { motion } from 'framer-motion';
import { hapticImpact, hapticSelect } from '../../utils/telegram';

interface CreateRoomOpts {
  name?: string;
  isPrivate: boolean;
  maxPlayers: number;
  totalRounds: number;
}

interface Props {
  onClose: () => void;
  onCreated: (opts: CreateRoomOpts) => void;
}

export default function CreateRoomModal({ onClose, onCreated }: Props) {
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(5);

  const options = [4, 6, 8, 10, 12];
  const roundsOpts = [3, 5, 10, 15];

  const submit = () => {
    hapticImpact('medium');
    onCreated({
      name: roomName.trim() || undefined,
      isPrivate,
      maxPlayers,
      totalRounds: rounds,
    });
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
        className="w-full sm:max-w-md glass-strong rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-2xl font-bold">Создать комнату 🔒</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20">✕</button>
        </div>

        {/* Название комнаты */}
        <label className="block mb-4">
          <span className="text-white/70 text-sm mb-1 block">Название комнаты</span>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Напр.: Весёлая тусовка 🎉"
            maxLength={32}
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-lime transition"
          />
        </label>

        {/* Приватность */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => { setIsPrivate(true); hapticSelect(); }}
            className={`rounded-xl p-3 font-semibold transition ${isPrivate ? 'bg-lime text-bg-900 shadow-glow' : 'bg-white/10 text-white/80'}`}
          >
            🔒 Приватная
          </button>
          <button
            onClick={() => { setIsPrivate(false); hapticSelect(); }}
            className={`rounded-xl p-3 font-semibold transition ${!isPrivate ? 'bg-accent-orange text-bg-900 shadow-glow-orange' : 'bg-white/10 text-white/80'}`}
          >
            🌐 Публичная
          </button>
        </div>
        <p className="text-white/50 text-xs mb-5">
          {isPrivate ? 'В комнату можно попасть только по коду приглашения' : 'Комната будет видна в общем списке'}
        </p>

        {/* Макс игроков */}
        <div className="mb-5">
          <span className="text-white/70 text-sm mb-2 block">Максимум игроков</span>
          <div className="flex gap-2 flex-wrap">
            {options.map((n) => (
              <button
                key={n}
                onClick={() => { setMaxPlayers(n); hapticSelect(); }}
                className={`w-12 h-12 rounded-xl font-bold transition ${maxPlayers === n ? 'bg-lime text-bg-900' : 'bg-white/10 text-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Раундов */}
        <div className="mb-6">
          <span className="text-white/70 text-sm mb-2 block">Количество раундов</span>
          <div className="flex gap-2 flex-wrap">
            {roundsOpts.map((n) => (
              <button
                key={n}
                onClick={() => { setRounds(n); hapticSelect(); }}
                className={`px-4 h-12 rounded-xl font-bold transition ${rounds === n ? 'bg-accent-pink text-white shadow-glow-pink' : 'bg-white/10 text-white'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          className="w-full py-4 rounded-2xl bg-lime text-bg-900 text-lg font-bold shadow-glow active:scale-95 transition"
        >
          Создать
        </button>
      </motion.div>
    </motion.div>
  );
}
