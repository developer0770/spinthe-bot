import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt';

// Глобально добавляем userId в стандартный Request Express
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

// Псевдоним для совместимости с импортами в роутах
export type AuthedRequest = Request;

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
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

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const payload = verifyAccessToken(header.slice(7).trim());
    if (payload) req.userId = payload.userId;
  }
  next();
}