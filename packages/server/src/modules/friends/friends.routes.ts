import { Router } from 'express';
import { authMiddleware, AuthedRequest } from '../../middlewares/auth.middleware';
import * as svc from './friends.service';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthedRequest, res) => {
  try {
    const list = await svc.listFriends(req.userId!);
    res.json({ ok: true, friends: list });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/request/:id', async (req: AuthedRequest, res) => {
  try {
    await svc.sendFriendRequest(req.userId!, Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/accept/:id', async (req: AuthedRequest, res) => {
  try {
    await svc.acceptFriendRequest(req.userId!, Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/remove/:id', async (req: AuthedRequest, res) => {
  try {
    await svc.removeFriend(req.userId!, Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/block/:id', async (req: AuthedRequest, res) => {
  try {
    await svc.blockUser(req.userId!, Number(req.params.id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/notifications', async (req: AuthedRequest, res) => {
  const list = await svc.listNotifications(req.userId!);
  res.json({ ok: true, notifications: list });
});

router.post('/notifications/read', async (req: AuthedRequest, res) => {
  await svc.markNotificationsRead(req.userId!);
  res.json({ ok: true });
});

export default router;
