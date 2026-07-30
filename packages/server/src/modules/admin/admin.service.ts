import { prisma } from '../../db/prisma';

/** Проверка прав администратора/модератора. */
export async function requireAdmin(userId: number): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return u?.role === 'admin' || u?.role === 'moderator';
}

/** Дашборд статистики. */
export async function getStats() {
  const [users, tables, activeTables, messages, reports, vip] = await Promise.all([
    prisma.user.count(),
    prisma.table.count(),
    prisma.table.count({ where: { status: { in: ['waiting', 'playing'] } } }),
    prisma.message.count(),
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { isVip: true } }),
  ]);
  return { users, tables, activeTables, messages, pendingReports: reports, vip };
}

/** Список пользователей с фильтрами (для админки). */
export async function listUsers(opts: { search?: string; banned?: boolean; limit?: number; offset?: number }) {
  const where: any = {};
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { username: { contains: opts.search, mode: 'insensitive' } },
    ];
  }
  if (opts.banned !== undefined) where.isBanned = opts.banned;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
      select: {
        id: true, telegramId: true, name: true, username: true, avatarUrl: true,
        gender: true, role: true, isBanned: true, isVip: true, heartsBalance: true,
        totalKisses: true, level: true, createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  return {
    total,
    users: users.map((u: any) => ({
      ...u,
      telegramId: Number(u.telegramId),
      totalKisses: Number(u.totalKisses),
    })),
  };
}

export async function banUser(adminId: number, userId: number, reason?: string) {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: true, banReason: reason || 'Нарушение правил' },
  });
}

export async function unbanUser(adminId: number, userId: number) {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  await prisma.user.update({ where: { id: userId }, data: { isBanned: false, banReason: null } });
}

export async function muteUser(adminId: number, userId: number, minutes: number) {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  const until = new Date(Date.now() + minutes * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { mutedUntil: until } });
}

export async function kickFromTable(adminId: number, userId: number): Promise<{ tableId: number | null }> {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  // Кикаем из активного стола
  const tp = await prisma.tablePlayer.findFirst({
    where: { userId, status: 'active' },
  });
  if (tp) {
    await prisma.tablePlayer.update({ where: { id: tp.id }, data: { status: 'kicked', leftAt: new Date() } });
    return { tableId: tp.tableId };
  }
  return { tableId: null };
}

export async function setRole(adminId: number, userId: number, role: 'user' | 'moderator' | 'admin') {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  await prisma.user.update({ where: { id: userId }, data: { role } });
}

export async function listPendingReports() {
  return prisma.report.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, name: true } },
      reported: { select: { id: true, name: true } },
    },
    take: 50,
  });
}

export async function resolveReport(adminId: number, reportId: number, resolve: 'resolved' | 'dismissed') {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  await prisma.report.update({
    where: { id: reportId },
    data: { status: resolve, resolvedAt: new Date(), resolvedBy: adminId },
  });
}

export async function createReport(reporterId: number, reportedId: number, reason: string, comment?: string, tableId?: number) {
  if (reporterId === reportedId) throw new Error('self_report');
  await prisma.report.create({
    data: { reporterId, reportedId, reason, comment, tableId },
  });
}

/** Управление подарками: toggle активность, обновление цен. */
export async function listGiftCatalog() {
  return prisma.giftCatalog.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function setGiftActive(adminId: number, giftId: string, active: boolean) {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  await prisma.giftCatalog.update({ where: { id: giftId }, data: { isActive: active } });
}

/** Управление столами: закрыть комнату. */
export async function listRooms() {
  return prisma.table.findMany({
    where: { status: { in: ['waiting', 'playing'] } },
    include: {
      _count: { select: { players: { where: { status: 'active' } } } },
      host: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function closeRoom(adminId: number, tableId: number) {
  if (!(await requireAdmin(adminId))) throw new Error('forbidden');
  await prisma.table.update({
    where: { id: tableId },
    data: { status: 'closed', closedAt: new Date() },
  });
}
