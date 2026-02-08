import { InjectiveIndexerClient } from '../injective/indexerClient';
import { OrderbookAnalyzer } from './orderbookAnalyzer';

export interface PersonalizedSignal {
  marketId: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  riskScore: number;
  entryPrice: number;
  exitPrice: number;
  reasons: string[];
}

export class SignalGenerator {
  private indexer: InjectiveIndexerClient;
  private orderbook: OrderbookAnalyzer;

  constructor() {
    this.indexer = new InjectiveIndexerClient();
    this.orderbook = new OrderbookAnalyzer();
  }

  async generateSignals(marketId: string, tradeLimit = 50): Promise<PersonalizedSignal> {
    const [orderbook, trades] = await Promise.all([
      this.orderbook.analyzeOrderbook(marketId),
      this.indexer.fetchTrades(marketId, tradeLimit)
    ]);

    const prices = trades.map((t) => parseFloat(t.price));
    const firstPrice = prices[prices.length - 1] || 0;
    const lastPrice = prices[0] || 0;
    const momentum = firstPrice > 0 ? (lastPrice - firstPrice) / firstPrice : 0;

    let buyVolume = 0;
    let sellVolume = 0;
    for (const trade of trades) {
      const side = String(trade.executionSide || '').toLowerCase();
      const qty = parseFloat(trade.quantity);
      if (side === 'buy') buyVolume += qty;
      if (side === 'sell') sellVolume += qty;
    }

    const totalVolume = buyVolume + sellVolume;
    const imbalance = totalVolume > 0 ? (buyVolume - sellVolume) / totalVolume : 0;

    const spreadPct = orderbook.spreadAnalysis.spreadPercentage;
    const liquidity = orderbook.liquidityConcentration;

    const reasons: string[] = [];
    if (momentum > 0.005) reasons.push('Positive short-term momentum');
    if (momentum < -0.005) reasons.push('Negative short-term momentum');
    if (imbalance > 0.1) reasons.push('Buy-side dominance');
    if (imbalance < -0.1) reasons.push('Sell-side dominance');
    if (spreadPct < 0.3) reasons.push('Tight spread');
    if (spreadPct > 1.0) reasons.push('Wide spread');

    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (momentum > 0.005 && imbalance > 0.1 && spreadPct < 0.5) signal = 'buy';
    if (momentum < -0.005 && imbalance < -0.1 && spreadPct < 0.5) signal = 'sell';

    const confidence = clamp01(Math.abs(momentum) * 10 + Math.abs(imbalance));
    const riskScore = clamp01(spreadPct / 2 + liquidity) * 100;

    const entryPrice = lastPrice || orderbook.spreadAnalysis.midPrice;
    const exitPrice = signal === 'buy'
      ? entryPrice * (1 + Math.max(momentum, 0.01))
      : entryPrice * (1 - Math.max(-momentum, 0.01));

    return {
      marketId,
      signal,
      confidence,
      riskScore,
      entryPrice,
      exitPrice,
      reasons
    };
  }
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
