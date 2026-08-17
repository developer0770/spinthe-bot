import { motion } from 'framer-motion';
import type { TablePlayerSlotDTO } from '@spinthe/shared';
import { getFrameImageUrl } from '../../utils/frameUtils';

interface Props {
  slot: TablePlayerSlotDTO | null;
  isMe: boolean;
  isHost: boolean;
  canKick: boolean;
  onKick: () => void;
  connStatus?: 'online' | 'reconnecting' | 'offline';
}

/** Плейсхолдер слота или реальный аватар игрока в лобби. */
export default function PlayerSlot({ slot, isMe, isHost, canKick, onKick, connStatus = 'online' }: Props) {
  if (!slot) {
    return (
      <div className="flex flex-col items-center" style={{ width: 64 }}>
        <div className="w-14 h-14 rounded-xl border-2 border-dashed border-white/25 bg-black/20 flex items-center justify-center text-white/30 text-2xl">
          +
        </div>
        <span className="text-white/40 text-[11px] mt-1">Свободно</span>
      </div>
    );
  }

  const { user } = slot;
  const color = user.gender === 'female' ? '#ec4899' : user.gender === 'male' ? '#3b82f6' : '#94c92e';
  const initial = user.name?.[0]?.toUpperCase() || '?';
  const displayName = isMe ? 'Ты' : user.name.length > 8 ? user.name.slice(0, 7) + '…' : user.name;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="flex flex-col items-center relative group"
      style={{ width: 64 }}
      onClick={() => canKick && onKick()}
    >
      <div
        className={`w-14 h-14 rounded-xl shadow-lg flex items-center justify-center text-xl font-bold text-white relative ${
          isMe ? 'ring-2 ring-lime' : ''
        } ${canKick ? 'cursor-pointer hover:ring-2 hover:ring-red-500' : ''}`}
        style={{ backgroundColor: color }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover rounded-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          initial
        )}
        {/* Рамка PNG */}
        {user.activeFrameId && (
          <img
            src={getFrameImageUrl(user.activeFrameId) || ''}
            alt="frame"
            className="absolute inset-0 w-full h-full rounded-xl pointer-events-none"
            style={{ objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {/* Корона хоста */}
        {isHost && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</div>
        )}
        {/* Индикатор реконнекта */}
        {connStatus === 'reconnecting' && (
          <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
            <div className="text-[9px] font-bold text-orange-400 animate-pulse">⟳</div>
          </div>
        )}
        {/* Индикатор онлайна */}
        {connStatus === 'online' && !isMe && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-lime border-2 border-[#14202e]" />
        )}
        {/* Поцелуйчики */}
        {user.kissesCount > 0 && (
          <span className="kisses-badge">{user.kissesCount > 99 ? '99+' : user.kissesCount}</span>
        )}
      </div>
      <span className="text-white text-[11px] mt-1 whitespace-nowrap font-semibold shadow-text max-w-[64px] overflow-hidden text-ellipsis">
        {displayName}
      </span>
      {user.age !== null && (
        <span className="text-white/70 text-[10px] shadow-text">{user.age} лет</span>
      )}
    </motion.div>
  );
}
