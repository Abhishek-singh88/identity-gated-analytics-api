import { IndexerGrpcSpotApi, PaginationOption } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints } from '@injectivelabs/networks';
import { getNetworkFromEnv } from './network';

export class InjectiveIndexerClient {
  private spotApi: IndexerGrpcSpotApi;

  constructor() {
    const endpoints = getNetworkEndpoints(getNetworkFromEnv());
    this.spotApi = new IndexerGrpcSpotApi(endpoints.indexer);
  }

  async fetchOrderbook(marketId: string) {
    return this.spotApi.fetchOrderbookV2(marketId);
  }

  async fetchTrades(marketId: string, limit = 50) {
    const pagination: PaginationOption = { limit };
    const { trades } = await this.spotApi.fetchTrades({ marketId, pagination });
    return trades;
  }
}
