import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { canUserManageChannel } from '../lib/channel-admin.js';
import { syncChannelStats } from '../services/channel-stats-sync.js';
import { sendMessage } from '../lib/telegram-api.js';
import { ChannelAdminRole } from '@prisma/client';

const createChannelBaseSchema = z.object({
  telegramId: z.union([z.number(), z.string(), z.null()]).optional(),
  username: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  subscribers: z.number().default(0),
  views: z.number().default(0),
  reach: z.number().default(0),
  language: z.string().optional(),
  premiumStats: z.record(z.unknown()).optional(),
  pricePerPostNano: z.string().optional().transform((v) => (v ? BigInt(v) : 0n)),
  isVerified: z.boolean().default(false),
});

const createChannelSchema = createChannelBaseSchema.refine(
  (data) => {
    const v = data.telegramId;
    if (v == null || v === '') return false;
    if (typeof v === 'string' && !v.trim()) return false;
    return true;
  },
  { message: 'Введите ID канала', path: ['telegramId'] }
);

const updateChannelSchema = createChannelBaseSchema.partial();

const addAdminSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ChannelAdminRole).default(ChannelAdminRole.PR_Manager),
});

export async function channelsRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  app.get('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const channels = await prisma.channel.findMany({
      where: {
        OR: [
          { ownerId: payload.sub },
          { admins: { some: { userId: payload.sub } } },
        ],
      },
      include: { _count: { select: { campaigns: true, deals: true } }, admins: { include: { user: { select: { id: true, username: true } } } } },
    });
    return reply.send(
      channels.map((c) => ({
        ...c,
        telegramId: c.telegramId?.toString() ?? null,
        pricePerPostNano: c.pricePerPostNano.toString(),
      }))
    );
  });

  // Публичный каталог (должен быть до /:id)
  app.get('/catalog', async (request: FastifyRequest, reply: FastifyReply) => {
    const channels = await prisma.channel.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        telegramId: true,
        username: true,
        title: true,
        subscribers: true,
        views: true,
        reach: true,
        language: true,
        languageCharts: true,
        premiumStats: true,
        pricePerPostNano: true,
        isVerified: true,
      },
    });
    return reply.send(
      channels.map((c) => ({
        ...c,
        telegramId: c.telegramId?.toString() ?? null,
        pricePerPostNano: c.pricePerPostNano.toString(),
      }))
    );
  });

  app.post('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const parsed = createChannelSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const raw = parsed.data.telegramId!;
    const isNumeric = typeof raw === 'number' || /^-?\d+$/.test(String(raw));
    const telegramId = isNumeric ? BigInt(raw) : null;
    const username =
      !isNumeric && typeof raw === 'string'
        ? String(raw).replace(/^@/, '')
        : parsed.data.username ?? undefined;
    const channel = await prisma.channel.create({
      data: {
        telegramId,
        username,
        title: parsed.data.title ?? null,
        description: parsed.data.description ?? null,
        subscribers: parsed.data.subscribers,
        views: parsed.data.views,
        reach: parsed.data.reach,
        language: parsed.data.language ?? null,
        premiumStats: parsed.data.premiumStats ? (parsed.data.premiumStats as object) : undefined,
        pricePerPostNano: parsed.data.pricePerPostNano ?? 0n,
        isVerified: parsed.data.isVerified,
        ownerId: payload.sub,
        admins: {
          create: { userId: payload.sub, role: ChannelAdminRole.Owner },
        },
      },
    });
    syncChannelStats(channel.id).catch((e) => {
      app.log.warn(e, 'Channel stats sync failed on create');
    });
    return reply.status(201).send({
      ...channel,
      // Если ID еще нет (ждем синхронизации), отправляем null, иначе — строку
      telegramId: channel.telegramId?.toString() ?? null,
      pricePerPostNano: channel.pricePerPostNano.toString(),
    });
  });

  app.get('/:id', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const payload = (request as { user: { sub: string } }).user;
    const canManage = await canUserManageChannel(payload.sub, id);
    if (!canManage) return reply.status(404).send({ error: 'Channel not found' });
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        admins: { include: { user: { select: { id: true, username: true, firstName: true } } } },
        owner: { select: { walletAddress: true } },
      },
    });
    if (!channel) return reply.status(404).send({ error: 'Channel not found' });
    return reply.send({
      ...channel,
      telegramId: channel.telegramId?.toString() ?? null,
      pricePerPostNano: channel.pricePerPostNano.toString(),
      ownerWallet: channel.owner?.walletAddress ?? null,
    });
  });

  app.get('/:id/order-info', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { owner: { select: { walletAddress: true, telegramId: true } } },
    });
    if (!channel) return reply.status(404).send({ error: 'Channel not found' });
    return reply.send({
      id: channel.id,
      title: channel.title,
      username: channel.username,
      pricePerPostNano: channel.pricePerPostNano.toString(),
      ownerWallet: channel.owner?.walletAddress ?? null,
    });
  });

  app.post('/:id/notify-interest', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { owner: { select: { telegramId: true } } },
    });
    if (!channel) return reply.status(404).send({ error: 'Channel not found' });
    if (!channel.owner?.telegramId) return reply.status(200).send({ ok: true });
    const chatId = channel.owner.telegramId.toString();
    try {
      const channelName = (channel.title ?? channel.username ?? channel.id).replace(/[<>&]/g, '');
      await sendMessage(
        chatId,
        `Кто-то хотел разместить рекламу в канале [${channelName}], но не смог — у вас не настроен кошелёк для приёма платежей. Добавьте wallet в профиле Mini App!`
      );
    } catch (e) {
      console.error('Notify-interest failed. Telegram API error:', e);
    }
    return reply.send({ ok: true });
  });

  app.patch('/:id', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = updateChannelSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { id } = request.params;
    const canManage = await canUserManageChannel((request as { user: { sub: string } }).user.sub, id);
    if (!canManage) return reply.status(404).send({ error: 'Channel not found' });
    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) return reply.status(404).send({ error: 'Channel not found' });

    const update: Record<string, unknown> = { ...parsed.data };
    if (update.telegramId != null) {
      const raw = update.telegramId as number | string;
      const isNumeric = typeof raw === 'number' || /^-?\d+$/.test(String(raw));
      (update as { telegramId?: bigint | null }).telegramId = isNumeric ? BigInt(raw) : null;
      if (!isNumeric && typeof raw === 'string') {
        update.username = String(raw).replace(/^@/, '');
      }
    }
    const updated = await prisma.channel.update({ where: { id }, data: update });
    return reply.send({
      ...updated,
      telegramId: updated.telegramId?.toString() ?? null,
      pricePerPostNano: updated.pricePerPostNano.toString(),
    });
  });

  // Добавить PR Manager / администратора канала
  app.post('/:id/admins', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = addAdminSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const { id } = request.params;
    const payload = (request as { user: { sub: string } }).user;
    const isOwner = await prisma.channel.findFirst({ where: { id, ownerId: payload.sub } });
    if (!isOwner) return reply.status(403).send({ error: 'Only channel owner can add admins' });
    const admin = await prisma.channelAdmin.create({
      data: { channelId: id, userId: parsed.data.userId, role: parsed.data.role },
      include: { user: { select: { id: true, username: true } } },
    });
    return reply.status(201).send(admin);
  });

  app.post('/:id/sync-stats', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const canManage = await canUserManageChannel((request as { user: { sub: string } }).user.sub, id);
    if (!canManage) return reply.status(404).send({ error: 'Channel not found' });
    const ok = await syncChannelStats(id);
    return reply.send({ success: ok });
  });

  app.delete('/:id/admins/:userId', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string; userId: string } }>, reply: FastifyReply) => {
    const { id, userId } = request.params;
    const payload = (request as { user: { sub: string } }).user;
    const isOwner = await prisma.channel.findFirst({ where: { id, ownerId: payload.sub } });
    if (!isOwner) return reply.status(403).send({ error: 'Only channel owner can remove admins' });
    await prisma.channelAdmin.deleteMany({ where: { channelId: id, userId, role: ChannelAdminRole.PR_Manager } });
    return reply.status(204).send();
  });
}
