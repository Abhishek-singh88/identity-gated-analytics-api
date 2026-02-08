import { FastifyInstance } from 'fastify';
import { OrderbookAnalyzer } from '../analytics/orderbookAnalyzer';
import { MarketIntelligenceAnalyzer } from '../analytics/marketIntelligence';
import { SignalGenerator } from '../analytics/signalGenerator';
import { requireAuth, requireTier } from '../middleware/authMiddleware';

export async function analyticsRoutes(fastify: FastifyInstance) {
  const analyzer = new OrderbookAnalyzer();
  const marketIntelligence = new MarketIntelligenceAnalyzer();
  const signalGenerator = new SignalGenerator();

  // Middleware to verify JWT
  fastify.addHook('onRequest', requireAuth);

  // Advanced orderbook analytics (NFT holder only)
  fastify.get('/api/v1/analytics/advanced-orderbook', { preHandler: requireTier('nftHolder') }, async (request, reply) => {
    const { marketId } = request.query as { marketId: string };
    
    if (!marketId) {
      return reply.code(400).send({ error: 'marketId required' });
    }

    const analysis = await analyzer.analyzeOrderbook(marketId);
    
    return analysis;
  });

  // Market intelligence (Premium tier only)
  fastify.get('/api/v1/analytics/market-intelligence', { preHandler: requireTier('premium') }, async (request, reply) => {
    const { marketIds, limit } = request.query as { marketIds: string; limit?: string };

    if (!marketIds) {
      return reply.code(400).send({ error: 'marketIds required (comma-separated)' });
    }

    const ids = marketIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return reply.code(400).send({ error: 'No valid marketIds provided' });
    }

    const tradeLimit = Math.min(parseInt(limit || '50', 10) || 50, 200);
    return marketIntelligence.analyzeMarkets(ids, tradeLimit);
  });

  // Personalized signals (NFT holder only)
  fastify.get('/api/v1/analytics/personalized-signals', { preHandler: requireTier('nftHolder') }, async (request, reply) => {
    const { marketId, limit } = request.query as { marketId: string; limit?: string };

    if (!marketId) {
      return reply.code(400).send({ error: 'marketId required' });
    }

    const tradeLimit = Math.min(parseInt(limit || '50', 10) || 50, 200);
    return signalGenerator.generateSignals(marketId, tradeLimit);
  });
}
