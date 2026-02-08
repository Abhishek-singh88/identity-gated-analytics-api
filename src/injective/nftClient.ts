import { getGrpcWebTransport } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import Redis from 'ioredis';
import { getNetworkFromEnv } from './network';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface NFTOwnership {
  isOwner: boolean;
  classId: string;
  nftId: string;
  walletAddress: string;
  tier: 'unverified' | 'nftHolder' | 'premium';
}

export class InjectiveNFTClient {
  private grpcEndpoint: string;
  private transport: ReturnType<typeof getGrpcWebTransport>;
  
  constructor(network: Network = getNetworkFromEnv()) {
    const endpoints = getNetworkEndpoints(network);
    this.grpcEndpoint = endpoints.grpc;
    this.transport = getGrpcWebTransport(this.grpcEndpoint);
  }

  async verifyNFTOwnership(
    walletAddress: string,
    classId: string,
    nftId: string
  ): Promise<NFTOwnership> {
    const bypass = String(process.env.DEV_BYPASS_NFT || '').toLowerCase() === 'true';
    if (bypass) {
      const tier = (process.env.DEV_BYPASS_NFT_TIER || 'nftHolder') as NFTOwnership['tier'];
      return {
        isOwner: true,
        classId,
        nftId,
        walletAddress,
        tier: tier === 'premium' ? 'premium' : 'nftHolder'
      };
    }

    // Check cache first
    const cacheKey = `nft:${walletAddress}:${classId}:${nftId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Query x/nft module via gRPC-web
      // Ownership key structure: 0x04 | classID | 0x00 | nftID
      const { QueryClient } = await import(
        '@injectivelabs/core-proto-ts-v2/esm/generated/cosmos/nft/v1beta1/query_pb.client.js'
      );

      const client = new QueryClient(this.transport);
      const response = await client.owner({ classId, id: nftId });
      const owner = response.owner || '';
      const isOwner = owner.toLowerCase() === walletAddress.toLowerCase();

      // Determine tier based on classId
      const tier = this.determineTier(classId, isOwner);

      const ownership: NFTOwnership = {
        isOwner,
        classId,
        nftId,
        walletAddress,
        tier
      };

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(ownership));
      
      return ownership;
    } catch (error) {
      console.error('NFT verification failed:', error);
      return {
        isOwner: false,
        classId,
        nftId,
        walletAddress,
        tier: 'unverified'
      };
    }
  }

  private determineTier(
    classId: string,
    isOwner: boolean
  ): 'unverified' | 'nftHolder' | 'premium' {
    if (!isOwner) return 'unverified';
    
    // N1NJ4 holders get premium tier
    if (classId.toLowerCase() === 'n1nj4') return 'premium';
    
    return 'nftHolder';
  }
}
