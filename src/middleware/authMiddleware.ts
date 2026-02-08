import { FastifyReply, FastifyRequest } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function requireTier(required: 'nftHolder' | 'premium') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { tier?: string } | undefined;
    const tier = user?.tier || 'unverified';

    if (required === 'nftHolder' && tier === 'unverified') {
      return reply.code(403).send({ error: 'NFT ownership required for this endpoint' });
    }

    if (required === 'premium' && tier !== 'premium') {
      return reply.code(403).send({ error: 'Premium NFT required for this endpoint' });
    }
  };
}
