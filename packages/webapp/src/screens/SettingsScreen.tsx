import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { hapticSelect, hapticImpact } from '../utils/telegram';
import { closeApp } from '../utils/telegram';

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(false);

  useEffect(() => {
    api<{ soundEnabled: boolean; musicEnabled: boolean }>('/users/me/settings')
      .then((r: any) => {
        setSound(r.soundEnabled ?? true);
        setMusic(r.musicEnabled ?? false);
      })
      .catch(() => {});
  }, []);

  const updateSettings = async (patch: { soundEnabled?: boolean; musicEnabled?: boolean }) => {
    await api('/users/me/settings', { method: 'PATCH', body: JSON.stringify(patch) });
  };

  const toggleSound = () => {
    hapticSelect();
    setSound((v) => { updateSettings({ soundEnabled: !v }); return !v; });
  };
  const toggleMusic = () => {
    hapticSelect();
    setMusic((v) => { updateSettings({ musicEnabled: !v }); return !v; });
  };

  const handleLogout = () => {
    if (!confirm('Выйти из аккаунта?')) return;
    hapticImpact('medium');
    localStorage.removeItem('spinthe:token');
    localStorage.removeItem('spinthe:user');
    location.reload();
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
        <button onClick={onClose} className="text-white/70">‹ Закрыть</button>
        <h1 className="text-white text-lg font-bold flex-1">⚙️ Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="glass rounded-2xl overflow-hidden">
          <ToggleRow label="🔊 Звуки" value={sound} onToggle={toggleSound} />
          <ToggleRow label="🎵 Музыка" value={music} onToggle={toggleMusic} />
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <LinkRow icon="📖" label="Правила игры" onClick={onClose} />
          <LinkRow icon="❓" label="Помощь / FAQ" onClick={onClose} />
        </div>

        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full p-4 text-left text-danger font-bold flex items-center gap-3 active:bg-white/5"
          >
            🚪 <span className="flex-1">Выйти</span> ›
          </button>
          <button
            onClick={() => { hapticSelect(); closeApp(); }}
            className="w-full p-4 text-left text-white/70 flex items-center gap-3 active:bg-white/5 border-t border-white/10"
          >
            ❌ <span className="flex-1">Закрыть приложение</span> ›
          </button>
        </div>

        <p className="text-white/30 text-center text-xs pt-4">Spin the Bottle v1.0</p>
      </div>
    </motion.div>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center gap-3 active:bg-white/5 border-b border-white/10 last:border-0 text-white"
    >
      <span className="flex-1 text-left font-semibold">{label}</span>
      <div className={`w-12 h-7 rounded-full transition relative ${value ? 'bg-lime' : 'bg-white/20'}`}>
        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

function LinkRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-center gap-3 text-white active:bg-white/5 border-b border-white/10 last:border-0"
    >
      <span className="text-xl">{icon}</span>
      <span className="flex-1 text-left font-semibold">{label}</span>
      <span className="text-white/40">›</span>
    </button>
  );
}
