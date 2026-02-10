import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { canUserManageChannel } from '../lib/channel-admin.js';
import { syncChannelStats } from '../services/channel-stats-sync.js';
import { ChannelAdminRole } from '@prisma/client';

const createChannelSchema = z.object({
  telegramId: z.number().or(z.string().transform(Number)),
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

const updateChannelSchema = createChannelSchema.partial();

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
        pricePerPostNano: c.pricePerPostNano.toString(),
      }))
    );
  });

  app.post('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const parsed = createChannelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const data = { ...parsed.data, telegramId: BigInt(parsed.data.telegramId), ownerId: payload.sub };
    const channel = await prisma.channel.create({
      data: {
        ...data,
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
      include: { admins: { include: { user: { select: { id: true, username: true, firstName: true } } } } },
    });
    if (!channel) return reply.status(404).send({ error: 'Channel not found' });
    return reply.send({
      ...channel,
      pricePerPostNano: channel.pricePerPostNano.toString(),
    });
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
    if (update.telegramId != null) update.telegramId = BigInt(update.telegramId as number);
    const updated = await prisma.channel.update({ where: { id }, data: update });
    return reply.send({
      ...updated,
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
