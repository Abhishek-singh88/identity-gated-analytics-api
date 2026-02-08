import { InjectiveIndexerClient } from '../injective/indexerClient';

export interface MarketIntelligenceMarket {
  marketId: string;
  tradeCount: number;
  totalVolume: number;
  totalNotional: number;
  avgTradeSize: number;
  buySellImbalance: number;
  lastPrice: number;
}

export interface MarketIntelligence {
  markets: MarketIntelligenceMarket[];
  volumeAnomalies: Array<{
    marketId: string;
    zScore: number;
    totalVolume: number;
  }>;
  correlationMetrics: Record<string, number>;
  unusualActivity: Array<{
    marketId: string;
    maxTradeNotional: number;
    buySellImbalance: number;
  }>;
}

export class MarketIntelligenceAnalyzer {
  private indexer: InjectiveIndexerClient;

  constructor() {
    this.indexer = new InjectiveIndexerClient();
  }

  async analyzeMarkets(marketIds: string[], tradeLimit = 50): Promise<MarketIntelligence> {
    const markets: MarketIntelligenceMarket[] = [];
    const priceSeries: Record<string, number[]> = {};

    for (const marketId of marketIds) {
      const trades = await this.indexer.fetchTrades(marketId, tradeLimit);

      const totalVolume = trades.reduce((sum, t) => sum + parseFloat(t.quantity), 0);
      const totalNotional = trades.reduce((sum, t) => sum + (parseFloat(t.quantity) * parseFloat(t.price)), 0);
      const avgTradeSize = trades.length > 0 ? totalVolume / trades.length : 0;

      let buyVolume = 0;
      let sellVolume = 0;
      for (const trade of trades) {
        const side = String(trade.executionSide || '').toLowerCase();
        const qty = parseFloat(trade.quantity);
        if (side === 'buy') buyVolume += qty;
        if (side === 'sell') sellVolume += qty;
      }

      const imbalance = totalVolume > 0 ? (buyVolume - sellVolume) / totalVolume : 0;
      const lastPrice = trades[0] ? parseFloat(trades[0].price) : 0;

      markets.push({
        marketId,
        tradeCount: trades.length,
        totalVolume,
        totalNotional,
        avgTradeSize,
        buySellImbalance: imbalance,
        lastPrice
      });

      priceSeries[marketId] = trades.map((t) => parseFloat(t.price));
    }

    const volumes = markets.map((m) => m.totalVolume);
    const mean = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
    const variance = volumes.length > 0
      ? volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length
      : 0;
    const stdDev = Math.sqrt(variance);

    const volumeAnomalies = markets
      .map((m) => ({
        marketId: m.marketId,
        zScore: stdDev > 0 ? (m.totalVolume - mean) / stdDev : 0,
        totalVolume: m.totalVolume
      }))
      .filter((m) => Math.abs(m.zScore) >= 2);

    const unusualActivity = markets
      .map((m) => ({
        marketId: m.marketId,
        maxTradeNotional: m.avgTradeSize * 5,
        buySellImbalance: m.buySellImbalance
      }))
      .filter((m) => Math.abs(m.buySellImbalance) >= 0.35);

    const correlationMetrics: Record<string, number> = {};
    for (let i = 0; i < marketIds.length; i += 1) {
      for (let j = i + 1; j < marketIds.length; j += 1) {
        const a = priceSeries[marketIds[i]] || [];
        const b = priceSeries[marketIds[j]] || [];
        const length = Math.min(a.length, b.length);
        if (length < 5) continue;

        const seriesA = a.slice(0, length);
        const seriesB = b.slice(0, length);
        const corr = pearson(seriesA, seriesB);
        correlationMetrics[`${marketIds[i]}:${marketIds[j]}`] = corr;
      }
    }

    return {
      markets,
      volumeAnomalies,
      correlationMetrics,
      unusualActivity
    };
  }
}

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;

  const meanA = a.reduce((sum, v) => sum + v, 0) / n;
  const meanB = b.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denom = Math.sqrt(denomA) * Math.sqrt(denomB);
  return denom === 0 ? 0 : numerator / denom;
}
