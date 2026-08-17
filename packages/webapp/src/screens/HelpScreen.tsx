import { motion } from 'framer-motion';

const FAQ = [
  { q: 'Как играть?', a: 'Создай комнату или зайди в существующую. Дождись минимум 2 игроков и нажми «Начать игру». По очереди жми «Крутить» — укажет на случайного игрока. Выбери «Поцеловать» и выполни задание «Правда или действие».' },
  { q: 'Что такое сердечки ❤️?', a: 'Основная валюта. За ними можно покупать подарки, скины и VIP. Получаешь за поцелуи, подарки и ежедневные награды.' },
  { q: 'Как получить монеты 🪙 и алмазы 💎?', a: 'Даются в ежедневных наградах. За алмазы и монеты можно купить эксклюзивные предметы и бустеры.' },
  { q: 'Что такое VIP?', a: 'Платная подписка на 30 дней, даёт уникальную золотую корону, бонусы и эксклюзивные стикеры.' },
  { q: 'Как пожаловаться на игрока?', a: 'В игре нажми и удерживай аватар игрока → «Пожаловаться». Модераторы рассмотрят жалобу.' },
  { q: 'Меня выкинуло из игры. Что делать?', a: 'Обнови страницу и заново войди в приложение. Прогресс сохранится.' },
  { q: 'Как пригласить друзей?', a: 'В лобби нажми «Пригласить» и отправь ссылку с кодом комнаты другу в Telegram.' },
];

export default function HelpScreen({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 bg-bg-900 flex flex-col"
    >
      <div className="h-14 bg-bg-800/95 border-b border-white/10 flex items-center px-4 gap-3 flex-shrink-0">
        <button onClick={onClose} className="text-white/70">‹ Назад</button>
        <h1 className="text-white text-lg font-bold flex-1">❓ Помощь</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {FAQ.map((item, i) => (
          <motion.details
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 group"
          >
            <summary className="text-white font-bold cursor-pointer list-none flex items-center justify-between">
              {item.q}
              <span className="text-lime transition-transform group-open:rotate-90">›</span>
            </summary>
            <p className="text-white/70 text-sm mt-2">{item.a}</p>
          </motion.details>
        ))}
        <p className="text-white/30 text-xs text-center py-6">Обратись к @super_spinthe_bot в Telegram, если остались вопросы.</p>
      </div>
    </motion.div>
  );
}
