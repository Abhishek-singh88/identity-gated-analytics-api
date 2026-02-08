import 'dotenv/config';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';
import { identityRoutes } from './routes/identity';
import { analyticsRoutes } from './routes/analytics';
import { resolveTierLimit } from './middleware/rateLimiter';


const fastify = Fastify({
  logger: true
});

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function start() {
  // Register plugins
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  });

  await fastify.register(cors, {
    origin: true
  });

  // Tiered rate limiting
  await fastify.register(rateLimit, {
    max: async (request) => {
      const user = request.user as { tier?: string } | undefined;
      const tier = user?.tier || 'unverified';

      return resolveTierLimit(tier);
    },
    timeWindow: '1 minute',
    redis
  });

  // Decorate with redis
  fastify.decorate('redis', redis);

  // Register routes
  await fastify.register(identityRoutes);
  await fastify.register(analyticsRoutes);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  try {
    await fastify.listen({ 
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0'
    });
    console.log('Server started on port', process.env.PORT || 3000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
