import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CreateRoomModal from '../components/room/CreateRoomModal';
import JoinRoomModal from '../components/room/JoinRoomModal';
import PublicRoomsModal from '../components/room/PublicRoomsModal';
import RoomLobby from '../components/lobby/RoomLobby';
import GameTable from '../components/game/GameTable';
import RulesModal from '../components/room/RulesModal';
import { useRouter } from '../store/routerStore';
import { useRoomStore } from '../store/roomStore';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { hapticImpact, hapticSelect } from '../utils/telegram';

type View = 'menu' | 'creating' | 'joining' | 'lobby' | 'playing' | 'error' | 'kicked';

export default function PlayScreen() {
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const openModal = useRouter((s) => s.openModal);
  const closeModal = useRouter((s) => s.closeModal);
  const currentModal = useRouter((s) => s.currentModal);

  const phase = useRoomStore((s) => s.phase);
  const table = useRoomStore((s) => s.table);
  const kickedMsg = useRoomStore((s) => s.errorMsg);
  const resetRoom = useRoomStore((s) => s.reset);

  const {
    createRoom,
    joinByCode,
    joinRandom,
    leave,
  } = useRoomSocket();

  // Синхронизация: когда стор сигналит что мы в комнате — переключаем view
  useEffect(() => {
    if (phase === 'lobby') setView('lobby');
    else if (phase === 'playing') setView('playing');
    else if (phase === 'kicked') setView('kicked');
    else if (phase === 'error') setView('error');
    else if (phase === 'none' && (view === 'lobby' || view === 'playing')) setView('menu');
  }, [phase]);

  // Быстрая игра
  const handleQuickPlay = useCallback(async () => {
    hapticImpact('medium');
    setBusy(true);
    setErrMsg('');
    const res = await joinRandom();
    setBusy(false);
    if (!res.ok) {
      if (res.code === 'no_room') {
        // Автоматически создаём новую публичную комнату
        setBusy(true);
        const cr = await createRoom({ isPrivate: false, maxPlayers: 8, totalRounds: 5, name: 'Быстрая игра' });
        setBusy(false);
        if (!cr.ok) setErrMsg(cr.error);
      } else {
        setErrMsg(res.error);
      }
    }
  }, [joinRandom, createRoom]);

  const handleCreate = async (opts: {
    name?: string; isPrivate: boolean; maxPlayers: number; totalRounds: number;
  }) => {
    hapticImpact('medium');
    setBusy(true);
    setErrMsg('');
    setView('menu');
    const res = await createRoom(opts);
    setBusy(false);
    if (!res.ok) setErrMsg(res.error);
  };

  const handleJoinByCode = async (code: string) => {
    hapticImpact('medium');
    setBusy(true);
    setErrMsg('');
    setView('menu');
    const res = await joinByCode(code);
    setBusy(false);
    if (!res.ok) setErrMsg(res.error);
  };

  const handleLeave = async () => {
    await leave();
    resetRoom();
    setView('menu');
  };

  // Сброс после кика
  useEffect(() => {
    if (view === 'kicked') {
      const t = setTimeout(() => {
        resetRoom();
        setView('menu');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [view, resetRoom]);

  // -------- Рендер состояний --------
  if (view === 'lobby') {
    return (
      <RoomLobby
        onLeave={handleLeave}
        onStart={() => setView('playing')}
      />
    );
  }

  if (view === 'playing') {
    return <GameTable onLeave={handleLeave} />;
  }

  if (view === 'kicked') {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="glass-strong rounded-3xl p-8 text-center max-w-sm">
          <div className="text-6xl mb-3">🚪</div>
          <h2 className="text-white text-2xl font-bold mb-2">Тебя кикнули</h2>
          <p className="text-white/70 mb-4">{kickedMsg || 'Хозяин комнаты решил без тебя…'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar pt-16 pb-24 px-4">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-white text-3xl font-bold mb-2"
      >
        Играть 🍾
      </motion.h2>
      <p className="text-white/60 mb-6">
        {busy ? 'Подключаемся…' : table ? `В комнате: ${table.name}` : 'Выбери как хочешь начать игру'}
      </p>

      {errMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-danger/20 border border-danger/40 text-white rounded-xl p-3 text-sm"
        >
          ⚠️ {errMsg}
        </motion.div>
      )}

      <div className="flex flex-col gap-3">
        {/* Быстрая игра */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleQuickPlay}
          disabled={busy}
          className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-lime-light via-lime to-lime-dark text-left shadow-glow disabled:opacity-60"
        >
          <div className="text-5xl mb-2">🎯</div>
          <div className="text-white text-2xl font-bold mb-1">Быстрая игра</div>
          <div className="text-white/90 text-sm">Сразу к случайному столу с игроками</div>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-white text-sm font-semibold">
            {busy ? 'Ищем…' : 'Играть →'}
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10" />
        </motion.button>

        {/* Создать приватную комнату */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { hapticSelect(); setView('creating'); setErrMsg(''); }}
          disabled={busy}
          className="glass rounded-3xl p-5 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-blue-700 flex items-center justify-center text-3xl shadow-lg">
            🔒
          </div>
          <div className="flex-1 text-left">
            <div className="text-white text-lg font-bold">Приватная комната</div>
            <div className="text-white/60 text-sm">Играй только с друзьями по коду</div>
          </div>
          <div className="text-white/60 text-2xl">›</div>
        </motion.button>

        {/* Войти по коду */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { hapticSelect(); setView('joining'); setErrMsg(''); }}
          disabled={busy}
          className="glass rounded-3xl p-5 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple to-purple-700 flex items-center justify-center text-3xl shadow-lg">
            🔗
          </div>
          <div className="flex-1 text-left">
            <div className="text-white text-lg font-bold">Войти по коду</div>
            <div className="text-white/60 text-sm">Если друг прислал приглашение</div>
          </div>
          <div className="text-white/60 text-2xl">›</div>
        </motion.button>

        {/* Публичные комнаты */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { hapticSelect(); openModal('publicRooms'); }}
          disabled={busy}
          className="glass rounded-3xl p-5 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-orange to-red-600 flex items-center justify-center text-3xl shadow-lg">
            🌐
          </div>
          <div className="flex-1 text-left">
            <div className="text-white text-lg font-bold">Публичные столы</div>
            <div className="text-white/60 text-sm">Выбрать стол из списка онлайн</div>
          </div>
          <div className="text-white/60 text-2xl">›</div>
        </motion.button>

        {/* Правила */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { hapticSelect(); openModal('rules'); }}
          className="glass rounded-3xl p-5 flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-3xl shadow-lg">
            📖
          </div>
          <div className="flex-1 text-left">
            <div className="text-white text-lg font-bold">Как играть?</div>
            <div className="text-white/60 text-sm">Правила и подсказки</div>
          </div>
          <div className="text-white/60 text-2xl">›</div>
        </motion.button>
      </div>

      {/* Модалки */}
      <AnimatePresence>
        {view === 'creating' && (
          <CreateRoomModal
            onClose={() => setView('menu')}
            onCreated={handleCreate}
          />
        )}
        {view === 'joining' && (
          <JoinRoomModal
            onClose={() => setView('menu')}
            onJoined={handleJoinByCode}
          />
        )}
        {currentModal === 'publicRooms' && (
          <PublicRoomsModal
            onClose={() => closeModal()}
            onJoined={() => closeModal()}
          />
        )}
        {currentModal === 'rules' && <RulesModal onClose={() => closeModal()} />}
      </AnimatePresence>
    </div>
  );
}

// ==================== CreateRoomModal — адаптер (передаёт opts в onCreated) ====================
// Переопределяем дефолтный CreateRoomModal чтобы он не принимал просто () => void, а передавал opts.
// Для этого создадим обёртку.
