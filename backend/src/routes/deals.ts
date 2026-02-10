import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { canUserManageChannel } from '../lib/channel-admin.js';
import { verifyUserIsChannelAdmin } from '../lib/telegram-api.js';
import { generateEscrowAddressForDeal } from '../services/escrow.js';
import { computeTextContentHash } from '../lib/draft-hash.js';
import { DealStatus, CampaignStatus } from '@prisma/client';

type JwtPayload = { sub: string; telegramId?: number };

const createDealSchema = z.object({
  campaignId: z.string().min(1),
  amountNano: z.string().min(1),
});

const uploadDraftSchema = z.object({
  draftText: z.string().min(1),
  draftMediaUrls: z.array(z.string()).default([]),
});

const reviewDraftSchema = z.object({
  approved: z.boolean(),
  rejectReason: z.string().optional(),
});

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export async function dealsRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  // Создать сделку (Advertiser) — после одобрения кампании Owner'ом
  app.post('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const parsed = createDealSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const campaign = await prisma.campaign.findFirst({
      where: { id: parsed.data.campaignId, advertiserId: payload.sub },
      include: { channel: true },
    });
    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' });
    if (campaign.status !== CampaignStatus.Accepted) {
      return reply.status(400).send({ error: 'Campaign must be accepted before creating a deal' });
    }

    const amountNano = BigInt(parsed.data.amountNano);
    const channel = campaign.channel;
    if (amountNano < channel.pricePerPostNano) {
      return reply.status(400).send({ error: 'Amount must be at least channel price' });
    }

    const owner = await prisma.user.findUnique({
      where: { id: channel.ownerId },
      select: { telegramId: true },
    });
    if (owner?.telegramId) {
      const isAdmin = await verifyUserIsChannelAdmin(channel.telegramId.toString(), Number(owner.telegramId));
      if (!isAdmin) {
        return reply.status(400).send({
          error: 'Channel owner is no longer an admin of this channel. Deal cannot be created.',
        });
      }
    }

    const deal = await prisma.deal.create({
      data: {
        campaignId: campaign.id,
        channelId: channel.id,
        advertiserId: payload.sub,
        ownerId: channel.ownerId,
        amountNano,
        status: DealStatus.Pending,
      },
      include: { campaign: true, channel: true },
    });

    const escrowAddress = await generateEscrowAddressForDeal(deal.id);
    if (escrowAddress) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: { escrowAddress },
      });
      (deal as { escrowAddress?: string }).escrowAddress = escrowAddress;
    }
    return reply.status(201).send({
      ...deal,
      amountNano: deal.amountNano.toString(),
    });
  });

  // Получить свои сделки (advertiser, owner или PR Manager канала)
  app.get('/', { preHandler: auth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const deals = await prisma.deal.findMany({
      where: {
        OR: [
          { advertiserId: payload.sub },
          { ownerId: payload.sub },
          { channel: { admins: { some: { userId: payload.sub } } } },
        ],
      },
      include: { campaign: true, channel: true },
    });
    return reply.send(
      deals.map((d) => ({
        ...d,
        amountNano: d.amountNano.toString(),
      }))
    );
  });

  app.get('/:id', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const payload = (request as { user: { sub: string } }).user;
    const deal = await prisma.deal.findFirst({
      where: {
        id,
        OR: [
          { advertiserId: payload.sub },
          { ownerId: payload.sub },
          { channel: { admins: { some: { userId: payload.sub } } } },
        ],
      },
      include: { campaign: true, channel: true, advertiser: true, owner: true },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found' });
    return reply.send({
      ...deal,
      amountNano: deal.amountNano.toString(),
    });
  });

  // Owner / PR Manager: загрузить черновик (Draft)
  app.post('/:id/draft', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = uploadDraftSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { id } = request.params;
    const payload = (request as { user: JwtPayload }).user;

    const deal = await prisma.deal.findFirst({
      where: { id, status: DealStatus.Funded },
      include: { channel: true },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found or wrong status' });

    const canManage = await canUserManageChannel(payload.sub, deal.channelId);
    if (!canManage) return reply.status(403).send({ error: 'Not authorized to manage this channel' });

    const telegramId = payload.telegramId;
    if (telegramId) {
      const isAdmin = await verifyUserIsChannelAdmin(deal.channel.telegramId.toString(), telegramId);
      if (!isAdmin) {
        return reply.status(403).send({
          error: 'You are no longer an admin of this channel. Please ensure your admin status in Telegram.',
        });
      }
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        draftText: parsed.data.draftText,
        draftMediaUrls: parsed.data.draftMediaUrls,
        status: DealStatus.Draft_Review,
        draftRejected: false,
        draftRejectReason: null,
      },
    });
    return reply.send({
      ...updated,
      amountNano: updated.amountNano.toString(),
    });
  });

  // Advertiser: одобрить или отклонить черновик
  app.post('/:id/draft/review', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = reviewDraftSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { id } = request.params;
    const payload = (request as { user: { sub: string } }).user;

    const deal = await prisma.deal.findFirst({
      where: { id, advertiserId: payload.sub, status: DealStatus.Draft_Review },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found or wrong status' });

    if (parsed.data.approved) {
      const draftContentHash = computeTextContentHash(deal.draftText ?? null);
      const updated = await prisma.deal.update({
        where: { id },
        data: {
          draftApprovedAt: new Date(),
          status: DealStatus.Scheduled,
          draftRejected: false,
          draftRejectReason: null,
          draftContentHash,
        },
      });
      return reply.send({ ...updated, amountNano: updated.amountNano.toString() });
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: {
        draftRejected: true,
        draftRejectReason: parsed.data.rejectReason ?? null,
        status: DealStatus.Funded, // Возврат к ожиданию нового черновика
        draftText: null,
        draftMediaUrls: [],
      },
    });
    return reply.send({ ...updated, amountNano: updated.amountNano.toString() });
  });

  // Планирование публикации (Owner, PR Manager или Advertiser после одобрения)
  app.post('/:id/schedule', { preHandler: auth }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = scheduleSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { id } = request.params;
    const payload = (request as { user: JwtPayload }).user;
    const scheduledAt = new Date(parsed.data.scheduledAt);

    const deal = await prisma.deal.findFirst({
      where: { id, status: DealStatus.Scheduled },
      include: { channel: true },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found or wrong status' });

    const isAdvertiser = deal.advertiserId === payload.sub;
    const canManageChannel = await canUserManageChannel(payload.sub, deal.channelId);

    if (!isAdvertiser && !canManageChannel) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (canManageChannel && payload.telegramId) {
      const isAdmin = await verifyUserIsChannelAdmin(deal.channel.telegramId.toString(), payload.telegramId);
      if (!isAdmin) {
        return reply.status(403).send({
          error: 'You are no longer an admin of this channel. Please ensure your admin status in Telegram.',
        });
      }
    }

    const updated = await prisma.deal.update({
      where: { id },
      data: { scheduledAt },
    });
    return reply.send({ ...updated, amountNano: updated.amountNano.toString() });
  });
}
