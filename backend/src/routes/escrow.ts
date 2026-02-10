import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getEscrowInfoForDeal, getEscrowBalance } from '../services/escrow.js';
import { DealStatus } from '@prisma/client';

const confirmFundedSchema = z.object({
  txHash: z.string().min(1),
});

export async function escrowRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  // Получить данные для перевода (адрес, сумма, comment)
  app.get('/deal/:dealId', { preHandler: auth }, async (request: FastifyRequest<{ Params: { dealId: string } }>, reply: FastifyReply) => {
    const { dealId } = request.params;
    const payload = (request as { user: { sub: string } }).user;

    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        advertiserId: payload.sub,
        status: DealStatus.Pending,
      },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found or wrong status' });

    const info = getEscrowInfoForDeal(deal.escrowAddress, deal.amountNano.toString());
    if (!info) {
      return reply.status(503).send({
        error: 'Escrow address not available. Ensure TON_ESCROW_MNEMONIC is configured.',
      });
    }

    return reply.send({
      ...info,
      instructions: 'Send amountNano nanotons to the unique deposit address for this deal.',
    });
  });

  // Подтвердить внесение средств (вызывается после проверки tx или webhook от TON API)
  app.post('/deal/:dealId/confirm-funded', { preHandler: auth }, async (request: FastifyRequest<{ Params: { dealId: string } }>, reply: FastifyReply) => {
    const parsed = confirmFundedSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { dealId } = request.params;
    const payload = (request as { user: { sub: string } }).user;

    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        advertiserId: payload.sub,
        status: DealStatus.Pending,
      },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found or wrong status' });

    // В production: верифицировать txHash через TON API
    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.Funded, txHash: parsed.data.txHash },
    });
    return reply.send({
      ...updated,
      amountNano: updated.amountNano.toString(),
    });
  });

  // Проверка баланса escrow по адресу сделки
  app.get('/deal/:dealId/balance', { preHandler: auth }, async (request: FastifyRequest<{ Params: { dealId: string } }>, reply: FastifyReply) => {
    const { dealId } = request.params;
    const payload = (request as { user: { sub: string } }).user;
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        OR: [
          { advertiserId: payload.sub },
          { ownerId: payload.sub },
          { channel: { admins: { some: { userId: payload.sub } } } },
        ],
      },
    });
    if (!deal) return reply.status(404).send({ error: 'Deal not found' });
    if (!deal.escrowAddress) return reply.status(404).send({ error: 'No escrow address for this deal' });
    const balance = await getEscrowBalance(deal.escrowAddress);
    return reply.send({ address: deal.escrowAddress, balanceNano: balance.toString() });
  });
}
