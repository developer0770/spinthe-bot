import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/client';
import { hapticImpact, hapticSelect } from '../utils/telegram';

export default function EditProfileScreen({ onClose }: { onClose: () => void }) {
  const me = useUserStore((s) => s.me);
  const setMe = useUserStore((s) => s.setMe);
  const [name, setName] = useState(me?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | null>(me?.gender || null);
  const [age, setAge] = useState<number>(me?.age || 18);
  const [saving, setSaving] = useState(false);
  const [showAge, setShowAge] = useState(false);
  const ages = Array.from({ length: 66 }, (_, i) => i + 14);

  const handleSave = async () => {
    setSaving(true);
    hapticImpact('medium');
    try {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - age);
      const r = await api<{ ok: boolean; user?: any; error?: string }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() || undefined,
          gender: gender || undefined,
          birthDate: birthDate.toISOString().slice(0, 10),
        }),
      });
      if (r.ok && r.user) {
        setMe(r.user);
        useAuthStore.setState({ user: r.user });
        try { localStorage.setItem('spinthe:user', JSON.stringify(r.user)); } catch {}
        onClose();
      }
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-white text-lg font-bold flex-1">Редактировать профиль</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-lime font-bold disabled:opacity-50"
        >
          {saving ? '…' : 'Сохранить'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="glass rounded-2xl p-4 space-y-3">
          <label className="block">
            <span className="text-white/70 text-sm mb-1 block">Имя</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white outline-none border border-transparent focus:border-lime"
              placeholder="Твоё имя"
            />
          </label>

          <div>
            <span className="text-white/70 text-sm mb-2 block">Пол</span>
            <div className="flex gap-3">
              {([
                { v: 'male' as const, l: '👨 Парень', c: '#29b6f6' },
                { v: 'female' as const, l: '👩 Девушка', c: '#ec4899' },
              ]).map((g) => (
                <button
                  key={g.v}
                  onClick={() => { setGender(g.v); hapticSelect(); }}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                    gender === g.v ? 'text-bg-900 ring-2 ring-white' : 'text-white/70 bg-white/10'
                  }`}
                  style={gender === g.v ? { backgroundColor: g.c } : {}}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-white/70 text-sm mb-2 block">Возраст: {age}</span>
            <button
              onClick={() => { hapticSelect(); setShowAge(true); }}
              className="w-full bg-white/10 rounded-xl py-3 text-white font-bold"
            >
              Изменить
            </button>
          </div>
        </div>

        <p className="text-white/40 text-xs text-center">
          Имя и возраст будут видны другим игрокам за столом.
        </p>
      </div>

      {showAge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 z-[60] flex items-end"
          onClick={() => setShowAge(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-bg-800 rounded-t-3xl p-4 max-h-[60vh] overflow-y-auto"
          >
            <h3 className="text-white text-center font-bold mb-3">Выбери возраст</h3>
            <div className="grid grid-cols-5 gap-2">
              {ages.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAge(a); setShowAge(false); hapticSelect(); }}
                  className={`py-3 rounded-xl font-bold ${a === age ? 'bg-lime text-bg-900' : 'bg-white/10 text-white'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
