import { api } from './client';

export interface AdminStats {
  users: number;
  tables: number;
  activeTables: number;
  messages: number;
  pendingReports: number;
  vip: number;
}

export interface AdminUser {
  id: number;
  telegramId: number;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  gender: string | null;
  role: 'user' | 'moderator' | 'admin';
  isBanned: boolean;
  isVip: boolean;
  heartsBalance: number;
  totalKisses: number;
  level: number;
  createdAt: string;
}

export interface AdminReport {
  id: number;
  reason: string;
  comment: string | null;
  createdAt: string;
  reporter: { id: number; name: string };
  reported: { id: number; name: string };
}

export interface AdminRoom {
  id: number;
  tableNumber: number;
  name: string;
  status: string;
  isPrivate: boolean;
  host: { id: number; name: string };
  _count: { players: number };
  createdAt: string;
}

export const adminRequest = <T = any>(path: string, options: RequestInit = {}): Promise<T> =>
  api<T>(`/admin${path}`, options);

export const getStats = () =>
  adminRequest<{ ok: true; stats: AdminStats }>('/stats').then((r) => r.stats);

export const getUsers = (params: { search?: string; banned?: boolean; limit?: number } = {}) => {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.banned !== undefined) qs.set('banned', params.banned ? '1' : '0');
  if (params.limit) qs.set('limit', String(params.limit));
  return adminRequest<{ ok: true; users: AdminUser[]; total: number }>(`/users?${qs.toString()}`);
};

export const banUser = (id: number, reason?: string) =>
  adminRequest(`/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) });
export const unbanUser = (id: number) =>
  adminRequest(`/users/${id}/unban`, { method: 'POST' });
export const muteUser = (id: number, minutes = 10) =>
  adminRequest(`/users/${id}/mute`, { method: 'POST', body: JSON.stringify({ minutes }) });
export const kickUser = (id: number) =>
  adminRequest(`/users/${id}/kick`, { method: 'POST' });
export const setRole = (id: number, role: 'user' | 'moderator' | 'admin') =>
  adminRequest(`/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) });

export const getReports = () =>
  adminRequest<{ ok: true; reports: AdminReport[] }>('/reports').then((r) => r.reports);

export const resolveReport = (id: number, action: 'resolve' | 'dismiss') =>
  adminRequest(`/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });

export const reportUser = (reportedId: number, reason: string, comment?: string, tableId?: number) =>
  api('/admin/report', {
    method: 'POST',
    body: JSON.stringify({ reportedId, reason, comment, tableId }),
  });

export const getTables = () =>
  adminRequest<{ ok: true; tables: AdminRoom[] }>('/tables').then((r) => r.tables);

export const closeTable = (id: number) =>
  adminRequest(`/tables/${id}/close`, { method: 'POST' });
