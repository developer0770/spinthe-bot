/**
 * Обёртка над fetch с автоматической подстановкой JWT в заголовки.
 */
const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'spinthe:token';
const USER_KEY = 'spinthe:user';

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const msg = typeof data === 'object' && data?.message ? data.message :
                typeof data === 'object' && data?.error ? data.error :
                `HTTP ${res.status}`;
    const code = typeof data === 'object' && data?.error ? data.error : 'request_failed';
    throw new ApiError(res.status, code, msg);
  }
  return data as T;
}

export async function getMe<T = any>() { return api<T>('/users/me'); }

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
