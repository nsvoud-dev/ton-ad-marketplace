import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { canUserManageChannel } from '../lib/channel-admin.js';
import { verifyUserIsChannelAdmin } from '../lib/telegram-api.js';
import { CampaignStatus } from '@prisma/client';

type JwtPayload = { sub: string; telegramId?: number };

const createCampaignSchema = z.object({
  channelId: z.string().min(1),
  briefTitle: z.string().optional(),
  briefDescription: z.string().optional(),
  briefTargetAudience: z.string().optional(),
  briefCallToAction: z.string().optional(),
  briefLinks: z.array(z.string()).default([]),
  briefDeadline: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  briefBudgetNano: z.string().optional().transform((v) => (v ? BigInt(v) : undefined)),
  briefNotes: z.string().optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

export async function campaignsRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  app.get('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const campaigns = await prisma.campaign.findMany({
      where: { advertiserId: payload.sub },
      include: { channel: true },
    });
    return reply.send(
      campaigns.map((c) => ({
        ...c,
        briefBudgetNano: c.briefBudgetNano?.toString(),
      }))
    );
  });

  app.post('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const parsed = createCampaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const channel = await prisma.channel.findUnique({
      where: { id: parsed.data.channelId },
    });
    if (!channel) return reply.status(404).send({ error: 'Channel not found' });

    const campaign = await prisma.campaign.create({
      data: {
        ...parsed.data,
        advertiserId: payload.sub,
        status: CampaignStatus.Submitted,
      },
      include: { channel: true },
    });
    return reply.status(201).send({
      ...campaign,
      briefBudgetNano: campaign.briefBudgetNano?.toString(),
    });
  });

  app.get('/:id', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const payload = (request as { user: { sub: string } }).user;
    const campaign = await prisma.campaign.findFirst({
      where: { id, advertiserId: payload.sub },
      include: { channel: true, deals: true },
    });
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });
    return reply.send({
      ...campaign,
      briefBudgetNano: campaign.briefBudgetNano?.toString(),
      deals: campaign.deals.map((d) => ({
        ...d,
        amountNano: d.amountNano.toString(),
      })),
    });
  });

  // Owner / PR Manager: список кампаний для своих каналов
  app.get('/owner/inbox', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const campaigns = await prisma.campaign.findMany({
      where: {
        OR: [
          { channel: { ownerId: payload.sub } },
          { channel: { admins: { some: { userId: payload.sub } } } },
        ],
        status: CampaignStatus.Submitted,
      },
      include: { channel: true, advertiser: true },
    });
    return reply.send(
      campaigns.map((c) => ({
        ...c,
        briefBudgetNano: c.briefBudgetNano?.toString(),
      }))
    );
  });

  // Owner / PR Manager: принять кампанию
  app.post('/:id/accept', { preHandler: [app.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const payload = (request as { user: JwtPayload }).user;
    const campaign = await prisma.campaign.findFirst({
      where: { id, status: CampaignStatus.Submitted },
      include: { channel: true },
    });
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });

    const canManage = await canUserManageChannel(payload.sub, campaign.channelId);
    if (!canManage) return reply.status(403).send({ error: 'Not authorized to manage this channel' });

    if (payload.telegramId) {
      const isAdmin = await verifyUserIsChannelAdmin(campaign.channel.telegramId.toString(), payload.telegramId);
      if (!isAdmin) {
        return reply.status(403).send({
          error: 'You are no longer an admin of this channel. Please ensure your admin status in Telegram.',
        });
      }
    }
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.Accepted },
      include: { channel: true },
    });
    return reply.send({ ...updated, briefBudgetNano: updated.briefBudgetNano?.toString() });
  });

  // Owner / PR Manager: отклонить кампанию
  app.post('/:id/reject', { preHandler: [app.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const payload = (request as { user: JwtPayload }).user;
    const campaign = await prisma.campaign.findFirst({
      where: { id, status: CampaignStatus.Submitted },
      include: { channel: true },
    });
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });

    const canManage = await canUserManageChannel(payload.sub, campaign.channelId);
    if (!canManage) return reply.status(403).send({ error: 'Not authorized to manage this channel' });

    if (payload.telegramId) {
      const isAdmin = await verifyUserIsChannelAdmin(campaign.channel.telegramId.toString(), payload.telegramId);
      if (!isAdmin) {
        return reply.status(403).send({
          error: 'You are no longer an admin of this channel. Please ensure your admin status in Telegram.',
        });
      }
    }
    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.Rejected },
      include: { channel: true },
    });
    return reply.send({ ...updated, briefBudgetNano: updated.briefBudgetNano?.toString() });
  });

  app.patch('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = updateCampaignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const { id } = request.params;
    const campaign = await prisma.campaign.findFirst({
      where: { id, advertiserId: (request as { user: { sub: string } }).user.sub },
    });
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });
    const updated = await prisma.campaign.update({
      where: { id },
      data: parsed.data,
      include: { channel: true },
    });
    return reply.send({
      ...updated,
      briefBudgetNano: updated.briefBudgetNano?.toString(),
    });
  });
}
