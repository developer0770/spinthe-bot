import { motion } from 'framer-motion';

interface Props {
  onClose: () => void;
}

const rules = [
  { icon: '🍾', title: 'Крути бутылочку', text: 'По очереди игроки крутят бутылочку. На кого укажет горлышко — с тем и предстоит "целоваться".' },
  { icon: '💬', title: 'Правда или действие', text: 'Пара решает, что делать: ответить на откровенный вопрос или выполнить забавное задание.' },
  { icon: '💋', title: 'Целуй или откажись', text: 'Можешь послать виртуальный поцелуй или вежливо отказаться. У каждого выбора последствия.' },
  { icon: '🎁', title: 'Дари подарки', text: 'Понравился игрок? Подари подарок — он появится у него на аватарке и принесёт тебе сердечки.' },
  { icon: '🏆', title: 'Зарабатывай очки', text: 'Каждый поцелуй — это +1 к счётчику. Топ игроков попадает в рейтинг недели!' },
  { icon: '❤️', title: 'Сердечки — валюта', text: 'Трать сердечки на подарки и бустеры, получай их за поцелуи и ежедневные бонусы.' },
];

export default function RulesModal({ onClose }: Props) {
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
        className="w-full sm:max-w-lg glass-strong rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-5" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-2xl font-bold">📖 Как играть?</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/80">✕</button>
        </div>

        <p className="text-white/70 mb-6">
          «Целуй и Знакомься» — это игра в бутылочку онлайн с реальными людьми.
          Крути, целуйся, общайся и заводи новых друзей!
        </p>

        <div className="flex flex-col gap-3">
          {rules.map((r, i) => (
            <div key={i} className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="text-3xl">{r.icon}</div>
              <div>
                <div className="text-white font-bold mb-1">{r.title}</div>
                <div className="text-white/70 text-sm">{r.text}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-4 rounded-2xl bg-lime text-bg-900 text-lg font-bold shadow-glow active:scale-95 transition"
        >
          Понятно!
        </button>
      </motion.div>
    </motion.div>
  );
}
