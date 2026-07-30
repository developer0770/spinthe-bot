import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { authMiddleware, AuthedRequest } from '../../middlewares/auth.middleware';
import * as dm from './dm.service';

const router = Router();
router.use(authMiddleware);

/** Список диалогов */
router.get('/conversations', async (req: AuthedRequest, res) => {
  const list = await dm.listDMConversations(req.userId!);
  res.json({ ok: true, conversations: list });
});

/** История сообщений с пользователем */
router.get('/:id', async (req: AuthedRequest, res) => {
  const messages = await dm.listDMs(req.userId!, Number(req.params.id));
  res.json({ ok: true, messages });
});

/** Отправить ЛС */
router.post('/:id', async (req: AuthedRequest, res) => {
  try {
    const msg = await dm.sendDM(req.userId!, Number(req.params.id), {
      text: req.body?.text,
      stickerId: req.body?.stickerId,
    });
    res.json({ ok: true, message: msg });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

/** Список стикеров */
router.get('/stickers/list', async (_req, res) => {
  res.json({ ok: true, stickers: dm.listStickers() });
});

/** Отметить сообщения как прочитанные */
router.post('/:id/read', async (req: AuthedRequest, res) => {
  await prisma.directMessage.updateMany({
    where: { toUserId: req.userId!, fromUserId: Number(req.params.id), isRead: false },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

export default router;
