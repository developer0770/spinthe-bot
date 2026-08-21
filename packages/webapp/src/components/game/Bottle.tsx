import { useState } from 'react';
import { motion } from 'framer-motion';
import { getBottleImageUrl, handleBottleError } from '../../utils/bottleUtils';

interface BottleProps {
  rotation?: number;
  onClick?: () => void;
  isSpinning?: boolean;
  size?: number;
  skin?: 'classic_green' | 'golden' | 'whiskey' | 'cola' | string;
  imageUrl?: string;
}

/**
 * Бутылочка — рендерит картинку из /bottles/ со встроенным SVG фолбэком.
 */
export default function Bottle({
  rotation = 0,
  onClick,
  isSpinning = false,
  size = 140,
  skin,
  imageUrl,
}: BottleProps) {
  const [imgError, setImgError] = useState(false);
  const src = imageUrl || (skin ? getBottleImageUrl(skin) : null);

  const onErrorHandler = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    handleBottleError(e);
    setImgError(true);
  };

  return (
    <motion.div
      onClick={onClick}
      className={`relative select-none ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: size, height: size, transformOrigin: 'center center' }}
      animate={isSpinning ? { rotate: 360 } : { rotate: rotation }}
      transition={
        isSpinning
          ? { repeat: Infinity, duration: 0.4, ease: 'linear' }
          : { type: 'spring', stiffness: 60, damping: 15, duration: 2.5 }
      }
    >
      {src && !imgError ? (
        <img
          src={src}
          alt="Bottle"
          style={{ width: size, height: size }}
          className="object-contain drop-shadow-2xl pointer-events-none"
          onError={onErrorHandler}
        />
      ) : (
        <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-2xl">
          {/* Горлышко */}
          <rect x="42" y="8" width="16" height="20" rx="3" fill="#2e7d32" />
          <rect x="40" y="26" width="20" height="6" rx="2" fill="#1b5e20" />
          {/* Тело бутылки */}
          <path
            d="M32 32 Q30 35 30 40 L30 78 Q30 90 40 92 L60 92 Q70 90 70 78 L70 40 Q70 35 68 32 Z"
            fill="#43a047"
            stroke="#1b5e20"
            strokeWidth="1.5"
          />
          {/* Блик */}
          <path
            d="M38 42 Q36 55 38 72"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="42" cy="38" rx="3" ry="2" fill="rgba(255,255,255,0.6)" />
          {/* Дно */}
          <rect x="30" y="88" width="40" height="4" rx="2" fill="#1b5e20" />
        </svg>
      )}
    </motion.div>
  );
}
