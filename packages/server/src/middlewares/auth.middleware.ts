import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt';

/**
 * Express-мидлварь: проверяет Bearer JWT и добавляет `req.userId`.
 * Если токена нет / невалиден — отвечает 401.
 */

export interface AuthedRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'missing_token',
      message: 'Authorization: Bearer <token> header required',
    });
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'invalid_token', message: 'Token is invalid or expired' });
    return;
  }

  req.userId = payload.userId;
  next();
}

/**
 * Вариант мидлвари, который НЕ отклоняет запрос при отсутствии токена,
 * но заполняет req.userId если токен есть (для публичных эндпоинтов).
 */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const payload = verifyAccessToken(header.slice(7).trim());
    if (payload) req.userId = payload.userId;
  }
  next();
}
