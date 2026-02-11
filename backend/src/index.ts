import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config.js';
import { prisma } from './lib/prisma.js';
import { startPostVerificationWorker } from './workers/post-verification.js';
import { authRoutes } from './routes/auth.js';
import { channelsRoutes } from './routes/channels.js';
import { campaignsRoutes } from './routes/campaigns.js';
import { dealsRoutes } from './routes/deals.js';
import { escrowRoutes } from './routes/escrow.js';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = Fastify({ logger: true });

async function bootstrap() {
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async function (
    request: { jwtVerify: () => Promise<{ sub: string }> },
    reply: { status: (c: number) => { send: (o: object) => unknown } }
  ) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
      throw new Error('Unauthorized');
    }
  } as any);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(channelsRoutes, { prefix: '/api/channels' });
  await app.register(campaignsRoutes, { prefix: '/api/campaigns' });
  await app.register(dealsRoutes, { prefix: '/api/deals' });
  await app.register(escrowRoutes, { prefix: '/api/escrow' });

  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  try {
    await prisma.$connect();
    startPostVerificationWorker();
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
