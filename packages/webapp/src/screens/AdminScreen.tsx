import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  getStats, getUsers, getReports, getTables,
  banUser, unbanUser, muteUser, kickUser, resolveReport, closeTable, setRole,
  AdminStats, AdminUser, AdminReport, AdminRoom,
} from '../api/admin';
import { hapticSelect, hapticImpact } from '../utils/telegram';

type Tab = 'stats' | 'users' | 'reports' | 'tables';

export default function AdminScreen({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [tables, setTables] = useState<AdminRoom[]>([]);
  const [search, setSearch] = useState('');

  const loadStats = useCallback(() => getStats().then(setStats).catch(() => {}), []);
  const loadUsers = useCallback(() => getUsers({ search: search || undefined, limit: 50 }).then((r) => setUsers(r.users)).catch(() => {}), [search]);
  const loadReports = useCallback(() => getReports().then(setReports).catch(() => {}), []);
  const loadTables = useCallback(() => getTables().then(setTables).catch(() => {}), []);

  useEffect(() => {
    if (tab === 'stats') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'reports') loadReports();
    if (tab === 'tables') loadTables();
  }, [tab, loadStats, loadUsers, loadReports, loadTables]);

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
        <h1 className="text-white text-lg font-bold">🛡️ Админ-панель</h1>
      </div>

      <div className="flex gap-1 p-2 bg-bg-800/60">
        {([
          { k: 'stats', l: '📊 Статистика' },
          { k: 'users', l: '👥 Пользователи' },
          { k: 'reports', l: '🚩 Жалобы' },
          { k: 'tables', l: '🍾 Комнаты' },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => { setTab(t.k); hapticSelect(); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === t.k ? 'bg-danger text-white' : 'bg-white/10 text-white/70'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        {tab === 'stats' && stats && (
          <div className="grid grid-cols-2 gap-3">
            <Stat icon="👥" label="Пользователей" value={stats.users} />
            <Stat icon="🍾" label="Всего комнат" value={stats.tables} />
            <Stat icon="🟢" label="Активных комнат" value={stats.activeTables} color="text-lime" />
            <Stat icon="💬" label="Сообщений" value={stats.messages} />
            <Stat icon="🚩" label="Жалоб" value={stats.pendingReports} color="text-danger" />
            <Stat icon="👑" label="VIP" value={stats.vip} color="text-accent-gold" />
            <button onClick={loadStats} className="col-span-2 py-3 rounded-2xl bg-lime text-bg-900 font-black active:scale-95">
              ↻ Обновить
            </button>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
              placeholder="Поиск по имени/username…"
              className="w-full bg-white/10 rounded-xl px-4 py-2 text-white mb-3 outline-none"
            />
            <div className="flex flex-col gap-2">
              {users.map((u) => (
                <div key={u.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${u.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}>
                    {u.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold truncate flex items-center gap-1">
                      {u.name}
                      {u.isBanned && <span className="text-danger text-xs">BAN</span>}
                      {u.role !== 'user' && <span className="text-accent-gold text-xs">{u.role}</span>}
                      {u.isVip && <span>👑</span>}
                    </div>
                    <div className="text-white/50 text-xs">id:{u.id} • ❤️{u.heartsBalance} • 💋{u.totalKisses} • ур.{u.level}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {u.isBanned ? (
                      <button onClick={() => { hapticImpact('medium'); unbanUser(u.id).then(loadUsers); }} className="text-xs bg-lime text-bg-90 px-2 py-0.5 rounded">Разбан</button>
                    ) : (
                      <button onClick={() => { hapticImpact('medium'); if (confirm('Бан?')) banUser(u.id).then(loadUsers); }} className="text-xs bg-danger text-white px-2 py-0.5 rounded">Бан</button>
                    )}
                    <button onClick={() => { hapticSelect(); muteUser(u.id, 30).then(() => alert('Мут 30 мин')); }} className="text-xs bg-accent-orange text-white px-2 py-0.5 rounded">Мут</button>
                    <button onClick={() => { hapticSelect(); kickUser(u.id).then(loadUsers); }} className="text-xs bg-white/10 text-white px-2 py-0.5 rounded">Кик</button>
                    {u.role === 'user' ? (
                      <button onClick={() => { if (confirm('Сделать модератором?')) setRole(u.id, 'moderator').then(loadUsers); }} className="text-xs bg-accent-blue text-white px-2 py-0.5 rounded">Мод</button>
                    ) : u.role === 'moderator' ? (
                      <button onClick={() => setRole(u.id, 'user').then(loadUsers)} className="text-xs bg-white/10 text-white px-2 py-0.5 rounded">Снять</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="flex flex-col gap-2">
            {reports.length === 0 && <div className="text-center text-white/50 py-10">Жалоб нет 🎉</div>}
            {reports.map((r) => (
              <div key={r.id} className="glass rounded-2xl p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="text-white font-bold text-sm">🚩 {r.reason}</div>
                  <div className="text-white/40 text-xs">{new Date(r.createdAt).toLocaleString('ru-RU')}</div>
                </div>
                <div className="text-white/80 text-sm">От: <span className="text-lime">{r.reporter.name}</span> → На: <span className="text-danger">{r.reported.name} (#{r.reported.id})</span></div>
                {r.comment && <div className="text-white/60 text-xs mt-1 italic">"{r.comment}"</div>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { hapticImpact('medium'); resolveReport(r.id, 'resolve').then(() => { banUser(r.reported.id).then(loadReports); }); }} className="flex-1 py-1.5 rounded-lg bg-danger text-white text-xs font-bold">Забанить</button>
                  <button onClick={() => { hapticSelect(); resolveReport(r.id, 'resolve').then(loadReports); }} className="flex-1 py-1.5 rounded-lg bg-lime text-bg-900 text-xs font-bold">ОК</button>
                  <button onClick={() => { hapticSelect(); resolveReport(r.id, 'dismiss').then(loadReports); }} className="flex-1 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold">Отклонить</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tables' && (
          <div className="flex flex-col gap-2">
            {tables.map((t) => (
              <div key={t.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <div className="text-2xl">{t.isPrivate ? '🔒' : '🌐'}</div>
                <div className="flex-1">
                  <div className="text-white font-bold">{t.name} #{t.tableNumber}</div>
                  <div className="text-white/60 text-xs">Хост: {t.host.name} • {t._count.players} чел • {t.status}</div>
                </div>
                <button onClick={() => { if (confirm('Закрыть комнату?')) closeTable(t.id).then(loadTables); }} className="bg-danger text-white px-2 py-1 rounded text-xs font-bold">Закрыть</button>
              </div>
            ))}
            {tables.length === 0 && <div className="text-center text-white/50 py-10">Нет активных комнат</div>}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value, color = 'text-white' }: { icon: string; label: string; value: number; color?: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <div className={`font-black text-2xl ${color}`}>{value.toLocaleString('ru-RU')}</div>
      <div className="text-white/60 text-xs">{label}</div>
    </div>
  );
}
