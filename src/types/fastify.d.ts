import 'fastify';
import '@fastify/jwt';
import type { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      walletAddress: string;
      tier: string;
      nftClassId?: string;
      nftId?: string;
    };
    user: {
      walletAddress: string;
      tier: string;
      nftClassId?: string;
      nftId?: string;
    };
  }
}
