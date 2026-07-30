import { Router } from 'express';
import { authMiddleware, AuthedRequest } from '../../middlewares/auth.middleware';
import * as shop from './shop.service';
import * as eco from '../economy/economy.service';
import { getLeaderboard, LeaderCategory, LeaderPeriod } from '../economy/leaderboard.service';
import { getUserDTO } from '../users/users.service';

const router = Router();
router.use(authMiddleware);

// ==== Магазин ====
router.get('/packs', (_req, res) => {
  res.json({ ok: true, packs: shop.HEART_PACKS });
});

router.post('/buy-pack/:id', async (req: AuthedRequest, res) => {
  try {
    const r = await shop.buyHeartsPack(req.userId!, req.params.id);
    res.json({ ok: true, ...r });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/buy-vip', async (req: AuthedRequest, res) => {
  try {
    const days = Number(req.body?.days) || 30;
    const r = await shop.buyVip(req.userId!, days);
    res.json({ ok: true, until: r.until });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/gifts', async (_req, res) => {
  const gifts = await shop.listGifts();
  res.json({ ok: true, gifts });
});

router.post('/gift/:toId/:giftId', async (req: AuthedRequest, res) => {
  try {
    const r = await shop.sendGift(
      req.userId!,
      Number(req.params.toId),
      req.params.giftId,
      req.body?.tableId ? Number(req.body.tableId) : undefined,
    );
    res.json({ ok: true, ...r });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/bottles', async (req: AuthedRequest, res) => {
  const list = await shop.listBottlesShop(req.userId!);
  res.json({ ok: true, bottles: list });
});

router.post('/buy-bottle/:id', async (req: AuthedRequest, res) => {
  try {
    await shop.buyBottle(req.userId!, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/equip-bottle/:id', async (req: AuthedRequest, res) => {
  try {
    await shop.equipBottle(req.userId!, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/frames', async (req: AuthedRequest, res) => {
  const list = await shop.listFramesShop(req.userId!);
  res.json({ ok: true, frames: list });
});

router.post('/buy-frame/:id', async (req: AuthedRequest, res) => {
  try {
    await shop.buyFrame(req.userId!, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/equip-frame/:id', async (req: AuthedRequest, res) => {
  try {
    await shop.equipFrame(req.userId!, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// ==== Инвентарь ====
router.get('/inventory', async (req: AuthedRequest, res) => {
  const inv = await shop.getInventory(req.userId!);
  res.json({ ok: true, inventory: inv });
});

// ==== Дейли награда ====
router.post('/daily/claim', async (req: AuthedRequest, res) => {
  try {
    const r = await eco.claimDaily(req.userId!);
    if (!r) return res.status(400).json({ ok: false, error: 'already_claimed' });
    const me = await getUserDTO(req.userId!);
    res.json({ ok: true, reward: r, me });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/daily/status', async (req: AuthedRequest, res) => {
  const { prisma } = await import('../../db/prisma');
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { lastDailyAt: true } });
  const canClaim = eco.canClaimDaily(user?.lastDailyAt || null);
  const ms = eco.msUntilNextDaily(user?.lastDailyAt || null);
  res.json({ ok: true, canClaim, nextInMs: ms });
});

// ==== Лидерборд ====
router.get('/leaderboard', async (req: AuthedRequest, res) => {
  const category = ((req.query.category as string) || 'kisses') as LeaderCategory;
  const period = ((req.query.period as string) || 'all') as LeaderPeriod;
  const r = await getLeaderboard(category, period, 50, req.userId!);
  res.json({ ok: true, ...r, category, period });
});

// ==== Информация о себе (обновлённые балансы) ====
router.get('/me', async (req: AuthedRequest, res) => {
  const me = await getUserDTO(req.userId!);
  res.json({ ok: true, me });
});

export default router;
