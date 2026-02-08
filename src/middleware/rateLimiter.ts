export type IdentityTier = 'unverified' | 'nftHolder' | 'premium';

export const tierLimits: Record<IdentityTier, number> = {
  unverified: 10,
  nftHolder: 100,
  premium: 1000
};

export function resolveTierLimit(tier?: string): number {
  if (tier === 'nftHolder') return tierLimits.nftHolder;
  if (tier === 'premium') return tierLimits.premium;
  return tierLimits.unverified;
}
