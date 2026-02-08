import Redis from 'ioredis';
import { InjectiveIndexerClient } from '../injective/indexerClient';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface OrderbookDepth {
  marketId: string;
  liquidityConcentration: number;
  whaleOrders: Array<{
    price: string;
    quantity: string;
    side: 'buy' | 'sell';
    isWhale: boolean;
  }>;
  spreadAnalysis: {
    bidAskSpread: number;
    spreadPercentage: number;
    midPrice: number;
  };
  depthMetrics: {
    bid1Percent: number;
    ask1Percent: number;
    totalBidVolume: number;
    totalAskVolume: number;
  };
}

export class OrderbookAnalyzer {
  private indexer: InjectiveIndexerClient;

  constructor() {
    this.indexer = new InjectiveIndexerClient();
  }

  async analyzeOrderbook(marketId: string): Promise<OrderbookDepth> {
    const cacheKey = `orderbook:analysis:${marketId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch orderbook from Injective Indexer
    const orderbook = await this.indexer.fetchOrderbook(marketId);
    
    const bids = orderbook.buys;
    const asks = orderbook.sells;

    // Calculate metrics
    const totalBidVolume = bids.reduce((sum, order) => 
      sum + parseFloat(order.quantity), 0
    );
    const totalAskVolume = asks.reduce((sum, order) => 
      sum + parseFloat(order.quantity), 0
    );

    // Detect whale orders (top 5% by volume)
    const whaleThreshold = Math.max(totalBidVolume, totalAskVolume) * 0.05;
    const whaleOrders = [
      ...bids.map(order => ({
        price: order.price,
        quantity: order.quantity,
        side: 'buy' as const,
        isWhale: parseFloat(order.quantity) >= whaleThreshold
      })),
      ...asks.map(order => ({
        price: order.price,
        quantity: order.quantity,
        side: 'sell' as const,
        isWhale: parseFloat(order.quantity) >= whaleThreshold
      }))
    ].filter(order => order.isWhale);

    // Spread analysis
    const bestBid = parseFloat(bids[0]?.price || '0');
    const bestAsk = parseFloat(asks[0]?.price || '0');
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    const spreadPercentage = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    // Liquidity concentration (Herfindahl index for top 10 orders)
    const top10BidVolume = bids.slice(0, 10).reduce((sum, order) => 
      sum + parseFloat(order.quantity), 0
    );
    const top10AskVolume = asks.slice(0, 10).reduce((sum, order) => 
      sum + parseFloat(order.quantity), 0
    );
    const denom = totalBidVolume + totalAskVolume;
    const liquidityConcentration = denom > 0
      ? (top10BidVolume + top10AskVolume) / denom
      : 0;

    const analysis: OrderbookDepth = {
      marketId,
      liquidityConcentration,
      whaleOrders,
      spreadAnalysis: {
        bidAskSpread: spread,
        spreadPercentage,
        midPrice
      },
      depthMetrics: {
        bid1Percent: totalBidVolume > 0 ? (parseFloat(bids[0]?.quantity || '0') / totalBidVolume) : 0,
        ask1Percent: totalAskVolume > 0 ? (parseFloat(asks[0]?.quantity || '0') / totalAskVolume) : 0,
        totalBidVolume,
        totalAskVolume
      }
    };

    // Cache for 30 seconds
    await redis.setex(cacheKey, 30, JSON.stringify(analysis));
    
    return analysis;
  }
}
