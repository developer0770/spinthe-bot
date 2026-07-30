import { motion } from 'framer-motion';

interface BottleProps {
  rotation?: number;
  onClick?: () => void;
  isSpinning?: boolean;
  size?: number;
  skin?: 'cola' | 'classic_green' | 'golden' | 'whiskey' | string;
}

/**
 * 2D-бутылочка Coca-Cola — SVG-спрайт високого качества.
 * Отображает контурную стеклянную бутылочку Coca-Cola с красной этикеткой и курсивным логотипом.
 */
export default function Bottle({
  rotation = 0,
  onClick,
  isSpinning = false,
  size = 140,
}: BottleProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`relative select-none ${onClick ? 'cursor-pointer' : ''}`}
      style={{ width: size, height: size, transformOrigin: 'center center' }}
      animate={isSpinning ? { rotate: 360 } : { rotate: rotation }}
      transition={
        isSpinning
          ? { repeat: Infinity, duration: 0.45, ease: 'linear' }
          : { type: 'spring', stiffness: 60, damping: 15, duration: 2.5 }
      }
    >
      {/* Реалистичная тень от бутылочки на деревянном столе */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, transparent 70%)',
          transform: 'scale(1.15, 0.4) translateY(60px)',
          filter: 'blur(8px)',
        }}
      />

      <svg viewBox="0 0 100 160" width={size} height={(size * 160) / 100} className="drop-shadow-xl overflow-visible">
        <defs>
          {/* Градиент стекла Coca-Cola */}
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#224d3c" />
            <stop offset="25%" stopColor="#48856c" />
            <stop offset="60%" stopColor="#316350" />
            <stop offset="100%" stopColor="#1a3d2f" />
          </linearGradient>

          {/* Напиток внутри */}
          <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#190906" />
            <stop offset="50%" stopColor="#2b110a" />
            <stop offset="100%" stopColor="#120604" />
          </linearGradient>

          {/* Красная этикетка Coca-Cola */}
          <linearGradient id="labelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef233c" />
            <stop offset="50%" stopColor="#d90429" />
            <stop offset="100%" stopColor="#b7092b" />
          </linearGradient>
        </defs>

        {/* Крышка (красный металл) */}
        <rect x="41" y="8" width="18" height="8" rx="2" fill="#d32f2f" stroke="#8b0000" strokeWidth="0.8" />
        <rect x="39" y="14" width="22" height="4" rx="1.5" fill="#f5f5f5" />

        {/* Горлышко */}
        <path d="M43 18 L43 38 Q43 48 30 58 L30 65 L70 65 L70 58 Q57 48 57 18 Z" fill="url(#glassGrad)" />

        {/* Тело напитка внутри */}
        <path
          d="M32 60 Q28 72 28 85 Q28 100 34 110 L34 142 Q34 148 42 149 L58 149 Q66 148 66 142 L66 110 Q72 100 72 85 Q72 72 68 60 Z"
          fill="url(#liquidGrad)"
        />

        {/* Стеклянный контур бутылки Coca-Cola (фигурный изгиб талии) */}
        <path
          d="M43 18 Q43 45 28 62 Q26 76 34 94 Q27 114 27 136 Q27 148 40 150 L60 150 Q73 148 73 136 Q73 114 66 94 Q74 76 72 62 Q57 45 57 18 Z"
          fill="url(#glassGrad)"
          opacity="0.88"
          stroke="#1b4031"
          strokeWidth="1.2"
        />

        {/* Красная этикетка Coca-Cola вокруг талии */}
        <g>
          <path d="M30 76 Q50 72 70 76 L68 102 Q50 98 32 102 Z" fill="url(#labelGrad)" />
          {/* Белые полоски сверху и снизу этикетки */}
          <path d="M30 78 Q50 74 70 78" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.9" />
          <path d="M31 100 Q50 96 69 100" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.9" />

          {/* Белая курсивная надпись Coca-Cola */}
          <text
            x="50"
            y="91"
            fill="#ffffff"
            fontSize="13"
            fontWeight="bold"
            fontStyle="italic"
            fontFamily='"Brush Script MT", "Segoe Script", cursive, sans-serif'
            textAnchor="middle"
          >
            Coca-Cola
          </text>
        </g>

        {/* Блик на стекле слева */}
        <path
          d="M34 26 Q36 42 31 60 M30 66 Q28 80 34 92 M30 110 Q29 128 32 142"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Дополнительный яркий точечный блик */}
        <ellipse cx="44" cy="24" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.85)" />

        {/* Дно бутылки */}
        <rect x="36" y="147" width="28" height="4" rx="2" fill="#143327" />
      </svg>
    </motion.div>
  );
}

