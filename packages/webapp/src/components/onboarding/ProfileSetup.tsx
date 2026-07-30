import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticImpact, hapticSelect } from '../../utils/telegram';
import { api } from '../../api/client';

/**
 * Экран первичной настройки профиля (онбординг).
 * Показывается после сплэша для новых пользователей — пол и возраст.
 * Дизайн по референсу: белая карточка на оливковом фоне.
 */
export default function ProfileSetup({ onComplete }: { onComplete: () => void }) {
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [age, setAge] = useState<number>(19);
  const [showAgePicker, setShowAgePicker] = useState(false);

  const ages = Array.from({ length: 66 }, (_, i) => i + 14); // 14–79

  const canContinue = gender !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    hapticImpact('medium');
    // Сохраняем профиль на бэк: пол + дата рождения по возрасту
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - age);
    api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ gender, birthDate: birthDate.toISOString().slice(0, 10) }),
    }).catch(() => {});
    onComplete();
  };

  return (
    <div className="fixed inset-0 splash-pattern flex items-center justify-center px-6 z-40">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-white rounded-[28px] shadow-2xl p-8 w-full max-w-sm"
      >
        <h2 className="text-center text-gray-400 text-xl font-semibold mb-1">
          Настройки профиля
        </h2>

        <p className="text-center text-black text-[22px] font-medium mt-4 mb-6 leading-snug">
          Расскажи о себе. Это необходимо,
          <br />
          чтобы подбирать партнёров за
          <br />
          столом
        </p>

        {/* Пол */}
        <div className="flex items-center justify-center gap-5 mb-8 mt-6">
          <span className="text-black text-2xl font-semibold mr-2">Пол:</span>

          <button
            onClick={() => { setGender('male'); hapticSelect(); }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
              gender === 'male'
                ? 'bg-sky-100 ring-4 ring-sky-400 scale-105'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            aria-label="Мужской"
          >
            <svg viewBox="0 0 64 64" className="w-14 h-14">
              {/* Иконка парня в голубом цвете */}
              <g fill={gender === 'male' ? '#29b6f6' : '#bdbdbd'}>
                <circle cx="32" cy="22" r="11" />
                <path d="M32 34c-10 0-18 7-18 16v4h36v-4c0-9-8-16-18-16z" />
              </g>
            </svg>
          </button>

          <button
            onClick={() => { setGender('female'); hapticSelect(); }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all ${
              gender === 'female'
                ? 'bg-pink-100 ring-4 ring-pink-400 scale-105'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            aria-label="Женский"
          >
            <svg viewBox="0 0 64 64" className="w-14 h-14">
              {/* Иконка девушки в розовом цвете */}
              <g fill={gender === 'female' ? '#ff69b4' : '#bdbdbd'}>
                <circle cx="32" cy="22" r="11" />
                <path d="M32 34c-10 0-18 7-18 16v4h14v6h-3v4h14v-4h-3v-6h14v-4c0-9-8-16-18-16z" />
              </g>
            </svg>
          </button>
        </div>

        {/* Возраст */}
        <div className="flex items-center justify-center gap-5 mb-8">
          <span className="text-black text-2xl font-semibold mr-2">Возраст:</span>
          <button
            onClick={() => { setShowAgePicker(true); hapticSelect(); }}
            className="bg-gray-100 hover:bg-gray-200 rounded-full px-8 py-3 flex items-center gap-3 min-w-[140px] justify-center"
          >
            <span className="text-black text-3xl font-bold italic">{age}</span>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Кнопка Продолжить */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full py-4 rounded-2xl text-white text-2xl font-bold transition-all mx-auto block ${
            canContinue
              ? 'bg-lime shadow-lg hover:bg-lime-dark active:scale-95'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Продолжить
        </button>
      </motion.div>

      {/* Пикер возраста */}
      <AnimatePresence>
        {showAgePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end z-50"
            onClick={() => setShowAgePicker(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full bg-white rounded-t-3xl p-6 max-h-[60vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-center text-xl font-bold mb-4 text-black">Выберите возраст</h3>
              <div className="grid grid-cols-5 gap-2">
                {ages.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAge(a); setShowAgePicker(false); hapticSelect(); }}
                    className={`py-3 rounded-xl text-lg font-semibold transition ${
                      age === a
                        ? 'bg-lime text-white'
                        : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
