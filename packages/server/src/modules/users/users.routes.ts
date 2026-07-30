import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { authMiddleware, AuthedRequest } from '../../middlewares/auth.middleware';
import { toUserDTO, toPublicUserDTO, updateProfile, updateSettings } from './users.service';

/**
 * Быстрая статистика для главного экрана:
 * - ранг в общем рейтинге по поцелуям
 * - количество полученных подарков
 */
async function getHomeStats(userId: number) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalKisses: true },
  });
  const [rankRes, giftsReceived] = await Promise.all([
    prisma.user.count({ where: { totalKisses: { gt: me?.totalKisses ?? BigInt(0) } } }),
    prisma.giftInstance.count({ where: { toUserId: userId } }),
  ]);
  return {
    rank: rankRes + 1,
    giftsReceived,
    kisses: Number(me?.totalKisses ?? 0),
  };
}

const router = Router();

/**
 * GET /api/users/me — текущий пользователь
 */
router.get('/me', authMiddleware, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) { res.status(404).json({ ok: false, error: 'not_found' }); return; }
  res.json({ ok: true, user: toUserDTO(user) });
});

/**
 * GET /api/users/me/stats — быстрая статистика для HomeScreen
 */
router.get('/me/stats', authMiddleware, async (req: AuthedRequest, res) => {
  try {
    const stats = await getHomeStats(req.userId!);
    res.json({ ok: true, ...stats });
  } catch {
    res.json({ ok: true, rank: 0, giftsReceived: 0, kisses: 0 });
  }
});

/**
 * PATCH /api/users/me — обновить профиль
 */
const patchMeSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female']).optional(),
  avatarUrl: z.union([z.string().url().max(1024), z.null()]).optional(),
}).transform((d) => ({
  ...d,
  avatarUrl: d.avatarUrl === null ? undefined : d.avatarUrl,
}));
router.patch('/me', authMiddleware, async (req: AuthedRequest, res) => {
  const parsed = patchMeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ ok: false, error: 'invalid_body', details: parsed.error.flatten() }); return; }
  const updated = await updateProfile(req.userId!, parsed.data);
  res.json({ ok: true, user: updated });
});

/**
 * GET /api/users/me/settings — звуки/музыка
 */
router.get('/me/settings', authMiddleware, async (req: AuthedRequest, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.userId! }, select: { soundEnabled: true, musicEnabled: true } });
  if (!u) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(u);
});

/**
 * PATCH /api/users/me/settings
 */
const patchSettingsSchema = z.object({
  soundEnabled: z.boolean().optional(),
  musicEnabled: z.boolean().optional(),
});
router.patch('/me/settings', authMiddleware, async (req: AuthedRequest, res) => {
  const parsed = patchSettingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'invalid_body' }); return; }
  const u = await updateSettings(req.userId!, parsed.data);
  res.json({ soundEnabled: u.soundEnabled, musicEnabled: u.musicEnabled });
});

/**
 * GET /api/users/:id — публичный профиль
 */
router.get('/:id', authMiddleware, async (req: AuthedRequest, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: 'invalid_id' }); return; }
  const pub = await toPublicUserDTO(id);
  if (!pub) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(pub);
});

export default router;
