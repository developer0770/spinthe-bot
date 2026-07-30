import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { listPublicRooms, RoomError } from './rooms.service';

const router = Router();

/**
 * GET /api/rooms/public — список публичных комнат.
 */
router.get('/public', authMiddleware, async (_req, res) => {
  try {
    const rooms = await listPublicRooms(30);
    res.json({ ok: true, rooms });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
export { RoomError };
