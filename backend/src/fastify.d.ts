import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (...args: unknown[]) => Promise<void>;
  }
}
