import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: number;
  telegramId: number;
  /** время выдачи (секунды) */
  iat?: number;
}

/**
 * Подписать JWT-токен доступа.
 */
export function signAccessToken(payload: Omit<JwtPayload, 'iat'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

/**
 * Проверить токен и распарсить payload.
 * Возвращает null если токен невалиден или истёк.
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    if (!decoded?.userId || !decoded?.telegramId) return null;
    return decoded;
  } catch {
    return null;
  }
}
