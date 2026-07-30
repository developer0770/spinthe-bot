import { Router } from 'express';
import { authMiddleware, AuthedRequest } from '../../middlewares/auth.middleware';
import { redis, RKEY } from '../../db/redis';
import { getIO } from '../../ws';
import * as admin from './admin.service';

const router = Router();

async function isAdmin(req: AuthedRequest, res: any, next: any) {
  if (!(await admin.requireAdmin(req.userId!))) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  next();
}

// ===== Публичный для авторизованных: подать жалобу =====
router.post('/report', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const { reportedId, reason, comment, tableId } = req.body;
    await admin.createReport(
      req.userId!,
      Number(reportedId),
      String(reason || 'other'),
      comment,
      tableId ? Number(tableId) : undefined,
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ===== Админские эндпоинты =====
router.use(authMiddleware, isAdmin);

router.get('/stats', async (_req, res) => {
  res.json({ ok: true, stats: await admin.getStats() });
});

router.get('/users', async (req: AuthedRequest, res) => {
  const r = await admin.listUsers({
    search: (req.query.search as string) || undefined,
    banned: req.query.banned === '1' ? true : req.query.banned === '0' ? false : undefined,
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0,
  });
  res.json({ ok: true, ...r });
});

router.post('/users/:id/ban', async (req: AuthedRequest, res) => {
  try {
    await admin.banUser(req.userId!, Number(req.params.id), req.body?.reason);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/users/:id/unban', async (req: AuthedRequest, res) => {
  try {
    await admin.unbanUser(req.userId!, Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/users/:id/mute', async (req: AuthedRequest, res) => {
  try {
    await admin.muteUser(req.userId!, Number(req.params.id), Number(req.body?.minutes || 10));
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/users/:id/kick', async (req: AuthedRequest, res) => {
  try {
    const r = await admin.kickFromTable(req.userId!, Number(req.params.id));
    // Принудительно уведомляем игрока по сокету
    try {
      const io = getIO();
      const sid = await redis.get(RKEY.userSocket(Number(req.params.id)));
      if (sid) {
        io.to(sid).emit('room:kicked', { reason: 'kicked_by_admin' });
        const sock = io.sockets.sockets.get(sid);
        if (sock) {
          if (r.tableId) sock.leave(`table:${r.tableId}`);
          sock.data.tableId = null;
        }
      }
      if (r.tableId) {
        io.to(`table:${r.tableId}`).emit('room:player_left', { userId: Number(req.params.id), reason: 'admin_kick' });
      }
    } catch {}
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/users/:id/role', async (req: AuthedRequest, res) => {
  try {
    await admin.setRole(req.userId!, Number(req.params.id), req.body?.role || 'user');
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/reports', async (_req, res) => {
  res.json({ ok: true, reports: await admin.listPendingReports() });
});

router.post('/reports/:id/resolve', async (req: AuthedRequest, res) => {
  try {
    await admin.resolveReport(req.userId!, Number(req.params.id), req.body?.action === 'dismiss' ? 'dismissed' : 'resolved');
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/gifts', async (_req, res) => {
  res.json({ ok: true, gifts: await admin.listGiftCatalog() });
});

router.post('/gifts/:id/active', async (req: AuthedRequest, res) => {
  try {
    await admin.setGiftActive(req.userId!, req.params.id, !!req.body?.active);
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/tables', async (_req, res) => {
  res.json({ ok: true, tables: await admin.listRooms() });
});

router.post('/tables/:id/close', async (req: AuthedRequest, res) => {
  try {
    await admin.closeRoom(req.userId!, Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
});

export default router;
