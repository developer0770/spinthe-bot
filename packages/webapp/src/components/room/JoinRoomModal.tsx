import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { hapticImpact } from '../../utils/telegram';

interface Props {
  onClose: () => void;
  onJoined: (code: string) => void;
}

/**
 * Модалка входа по коду комнаты. 6 цифр/букв, раздельные инпуты с автофокусом.
 */
export default function JoinRoomModal({ onClose, onJoined }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigit = (i: number, v: string) => {
    // Разрешаем буквы и цифры, верхний регистр
    const d = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError('');
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const code = digits.join('');
  const canSubmit = code.length === 6;

  const submit = () => {
    if (!canSubmit) { setError('Введите 6 символов кода'); return; }
    hapticImpact('medium');
    onJoined(code);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-3xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-2xl font-bold">Войти в комнату</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/80">✕</button>
        </div>

        <p className="text-white/60 text-sm mb-6">Введите 6-значный код комнаты от друга</p>

        <div className="flex gap-2 justify-between mb-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKey(i, e)}
              inputMode="text"
              autoCapitalize="characters"
              maxLength={1}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-white/10 text-white outline-none transition uppercase ${
                error ? 'border-danger' : d ? 'border-lime' : 'border-white/20 focus:border-lime'
              }`}
            />
          ))}
        </div>
        {error && <p className="text-danger text-xs mb-2 text-center">{error}</p>}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`w-full mt-6 py-4 rounded-2xl text-lg font-bold transition active:scale-95 ${
            canSubmit ? 'bg-lime text-bg-900 shadow-glow' : 'bg-white/10 text-white/50'
          }`}
        >
          Войти
        </button>
      </motion.div>
    </motion.div>
  );
}
