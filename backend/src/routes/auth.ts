import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { verifyTelegramWebAppData, parseInitData } from '../lib/telegram-auth.js';

const authBodySchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = authBodySchema.safeParse((request.body as object) ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
    if (!botToken || !verifyTelegramWebAppData(parsed.data.initData, botToken)) {
      return reply.status(401).send({ error: 'Invalid initData' });
    }

    const data = parseInitData(parsed.data.initData);
    if (!data?.user) {
      return reply.status(400).send({ error: 'No user in initData' });
    }

    const { id, username, first_name, last_name } = data.user;
    const telegramId = BigInt(id);

    let user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: username ?? null,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { telegramId },
        data: {
          username: username ?? user.username,
          firstName: first_name ?? user.firstName,
          lastName: last_name ?? user.lastName,
        },
      });
    }

    const token = app.jwt.sign(
      { sub: user.id, telegramId: id },
      { expiresIn: '7d' }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        walletAddress: user.walletAddress,
        balanceNano: user.balanceNano.toString(),
      },
    });
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const payload = (request as { user: { sub: string } }).user;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return reply.send({
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      walletAddress: user.walletAddress,
      balanceNano: user.balanceNano.toString(),
    });
  });
}
