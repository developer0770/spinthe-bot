import { motion } from 'framer-motion';
import { useRouter, TabId } from '../../store/routerStore';
import { hapticSelect } from '../../utils/telegram';

interface NavItem {
  id: TabId;
  label: string;
  icon: (active: boolean) => JSX.Element;
}

const items: NavItem[] = [
  {
    id: 'home',
    label: 'Главная',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className={`w-6 h-6 ${a ? 'text-lime' : 'text-white/60'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'play',
    label: 'Играть',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className={`w-7 h-7 ${a ? 'text-lime' : 'text-white/60'}`} fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M9 3L11 8H5L8 3zM15 3l2 5h-6l2-5zM11 14a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z"/>
        <path d="M4 9h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9z" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'shop',
    label: 'Магазин',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className={`w-6 h-6 ${a ? 'text-accent-gold' : 'text-white/60'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7h18l-1.5 11a2 2 0 01-2 1.8H6.5a2 2 0 01-2-1.8L3 7z" strokeLinejoin="round"/>
        <path d="M8 7V5a4 4 0 118 0v2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Топ',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className={`w-6 h-6 ${a ? 'text-accent-orange' : 'text-white/60'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 4h10v4a5 5 0 01-10 0V4z"/>
        <path d="M7 6H4a2 2 0 000 4h3M17 6h3a2 2 0 010 4h-3" strokeLinecap="round"/>
        <path d="M9 14v4h6v-4M8 21h8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className={`w-6 h-6 ${a ? 'text-accent-pink' : 'text-white/60'}`} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { tab, setTab } = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Центральная кнопка «Играть» — выделенная */}
      <div className="relative h-16 pointer-events-none">
        <div className="glass-dark absolute bottom-0 left-0 right-0 h-16 flex items-end justify-around px-2 pb-2 pt-1 border-t border-white/10">
          {items.map((item) => {
            const active = tab === item.id;
            const isCenter = item.id === 'play';

            if (isCenter) {
              return (
                <button
                  key={item.id}
                  onClick={() => { hapticSelect(); setTab(item.id); }}
                  className="pointer-events-auto relative -mt-8 flex flex-col items-center justify-center"
                >
                  {/* Кнопка с glow */}
                  <motion.div
                    whileTap={{ scale: 0.88 }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-glow transition-colors ${
                      active
                        ? 'bg-gradient-to-br from-lime-light to-lime text-bg-900'
                        : 'bg-gradient-to-br from-lime to-lime-dark text-white'
                    }`}
                    style={{ boxShadow: active ? '0 0 24px rgba(148,201,46,0.7)' : '0 6px 20px rgba(0,0,0,0.5)' }}
                  >
                    {item.icon(active)}
                  </motion.div>
                  <span className="text-[10px] mt-0.5 text-lime font-semibold">{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => { hapticSelect(); setTab(item.id); }}
                className="pointer-events-auto flex flex-col items-center justify-center gap-0.5 pt-1 pb-1 px-3 min-w-[56px]"
              >
                <motion.div
                  animate={{ scale: active ? 1.1 : 1, y: active ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {item.icon(active)}
                </motion.div>
                <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-white' : 'text-white/50'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area для iOS */}
        <div className="h-safe bg-bg-900 h-2" />
      </div>
    </div>
  );
}
