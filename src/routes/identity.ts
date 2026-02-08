import { FastifyInstance } from 'fastify';
import { InjectiveNFTClient } from '../injective/nftClient';
import { verifyWalletSignature, generateAuthMessage } from '../auth/verifySignature';

export async function identityRoutes(fastify: FastifyInstance) {
  const nftClient = new InjectiveNFTClient();

  // Generate challenge for wallet signature
  fastify.post('/api/v1/auth/challenge', async (request, reply) => {
    const { walletAddress } = request.body as { walletAddress: string };
    
    if (!walletAddress) {
      return reply.code(400).send({ error: 'Wallet address required' });
    }

    const { message, nonce } = generateAuthMessage(walletAddress);
    const walletKey = walletAddress.toLowerCase();
    
    // Store nonce temporarily (5 min expiry)
    await fastify.redis.setex(`nonce:${walletKey}`, 300, nonce);
    
    return {
      message,
      nonce
    };
  });

  // Verify identity and issue JWT
  fastify.post('/api/v1/verify-identity', async (request, reply) => {
    const { 
      walletAddress, 
      signature, 
      message,
      nftClassId, 
      nftId 
    } = request.body as {
      walletAddress: string;
      signature: string;
      message: string;
      nftClassId: string;
      nftId: string;
    };

    if (!walletAddress || !signature || !message || !nftClassId || !nftId) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    let parsedMessage: { walletAddress: string; timestamp: number; nonce: string };
    try {
      parsedMessage = JSON.parse(message);
    } catch {
      return reply.code(400).send({ error: 'Invalid message payload' });
    }

    if (parsedMessage.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return reply.code(401).send({ verified: false, error: 'Wallet mismatch' });
    }

    const walletKey = walletAddress.toLowerCase();
    const storedNonce = await fastify.redis.get(`nonce:${walletKey}`);
    if (!storedNonce || storedNonce !== parsedMessage.nonce) {
      return reply.code(401).send({ verified: false, error: 'Invalid or expired nonce' });
    }

    const now = Date.now();
    const maxAgeMs = 5 * 60 * 1000;
    if (!parsedMessage.timestamp || now - parsedMessage.timestamp > maxAgeMs) {
      return reply.code(401).send({ verified: false, error: 'Message expired' });
    }

    // Verify signature
    const isValidSignature = verifyWalletSignature(
      message,
      signature,
      walletAddress
    );

    if (!isValidSignature) {
      return reply.code(401).send({ 
        verified: false, 
        error: 'Invalid signature' 
      });
    }

    // Verify NFT ownership
    const ownership = await nftClient.verifyNFTOwnership(
      walletAddress,
      nftClassId,
      nftId
    );

    if (!ownership.isOwner) {
      return reply.code(403).send({
        verified: false,
        error: 'NFT ownership verification failed'
      });
    }

    await fastify.redis.del(`nonce:${walletKey}`);

    // Issue JWT
    const token = fastify.jwt.sign({
      walletAddress,
      tier: ownership.tier,
      nftClassId,
      nftId
    }, {
      expiresIn: '24h'
    });

    return {
      verified: true,
      accessToken: token,
      tier: ownership.tier,
      expiresIn: 86400
    };
  });
}
