# Identity-Gated Trading Analytics API

Verifies NFT ownership on Injective and gates access to advanced trading analytics derived from on-chain orderbook data.

## What It Does
- Verifies Injective NFT ownership via the `x/nft` module
- Issues JWTs after a single signature challenge
- Delivers computed orderbook depth metrics, market intelligence, and personalized signals
- Applies tiered access and rate limits by identity tier

## Endpoints
- `POST /api/v1/auth/challenge`
- `POST /api/v1/verify-identity`
- `GET /api/v1/analytics/advanced-orderbook`
- `GET /api/v1/analytics/market-intelligence`
- `GET /api/v1/analytics/personalized-signals`

## Injective Data Sources
- `x/nft` module for ownership verification
- Indexer gRPC API for orderbooks and trades

## Run Locally
```bash
npm install
cp .env.example .env
npm run dev
```

## Example Flow
1. `POST /api/v1/auth/challenge` with `{ "walletAddress": "inj..." }`
2. Sign the returned `message` with the wallet
3. `POST /api/v1/verify-identity` with `{ walletAddress, signature, message, nftClassId, nftId }`
4. Use `accessToken` as `Authorization: Bearer <token>`

## Notes
- `INJ_NETWORK` supports `mainnet`, `testnet`, and `devnet`.
- Tier rules: `nftHolder` for verified NFT owners, `premium` for the `n1nj4` class.
- Dev testing without NFTs: set `DEV_BYPASS_NFT=true` and optionally `DEV_BYPASS_NFT_TIER=premium`.
- Dev testing without signatures: set `DEV_BYPASS_SIGNATURE=true` (also set `DEV_BYPASS_NFT=true`).
