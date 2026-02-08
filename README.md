# Identity-Gated Trading Analytics API

An Injective-native API that verifies NFT ownership on-chain and gates access to advanced trading analytics derived from Injective orderbook data. The core idea is simple: prove identity once, then unlock higher‑value analytics based on NFT tier.

## Why This Is Contest-Ready
- Real on‑chain verification using Injective’s `x/nft` module (not a mock).
- Computed analytics (liquidity concentration, whale detection, spread metrics) instead of raw pass‑through data.
- Clean developer experience: one-time signature → JWT → gated endpoints.
- Tiered access + rate limits show a credible product model.

## What It Does
- Issues a challenge message for a wallet to sign.
- Verifies signature and NFT ownership on Injective.
- Issues a JWT with a tier (`unverified`, `nftHolder`, `premium`).
- Serves analytics endpoints that are gated by tier.
- Caches expensive calls in Redis.

## Tech Stack
- Fastify + TypeScript
- Injective SDK (`@injectivelabs/sdk-ts`, `@injectivelabs/networks`)
- Redis for caching and rate limiting
- JWT for auth

## Local Setup
```bash
npm install
cp .env.example .env
npm run dev
```

## Configuration (.env)
```
NODE_ENV=development
PORT=3000
JWT_SECRET=change-me
REDIS_URL=redis://localhost:6379
INJ_NETWORK=mainnet

# Dev-only shortcuts
DEV_BYPASS_NFT=true
DEV_BYPASS_NFT_TIER=nftHolder
DEV_BYPASS_SIGNATURE=true
```

Notes:
- Use `INJ_NETWORK=testnet` to query testnet.
- For demos without NFTs, use `DEV_BYPASS_NFT=true` and `DEV_BYPASS_SIGNATURE=true`.

## Auth Workflow (Brief)
1. Client requests a challenge message.
2. Client signs it with an Injective wallet.
3. Server verifies signature + NFT ownership.
4. Server issues JWT for gated analytics.

## Endpoints

### 1) Challenge
`POST /api/v1/auth/challenge`

Request body:
```json
{ "walletAddress": "inj1..." }
```

Response:
```json
{ "message": "{...}", "nonce": "..." }
```

### 2) Verify Identity (JWT issuance)
`POST /api/v1/verify-identity`

Request body:
```json
{
  "walletAddress": "inj1...",
  "signature": "0x...",
  "message": "{...}",
  "nftClassId": "n1nj4",
  "nftId": "1"
}
```

Response:
```json
{
  "verified": true,
  "accessToken": "JWT...",
  "tier": "nftHolder",
  "expiresIn": 86400
}
```

### 3) Advanced Orderbook Analytics (NFT holder)
`GET /api/v1/analytics/advanced-orderbook?marketId=...`

Returns:
- liquidity concentration
- whale order detection
- spread analysis
- depth metrics

### 4) Market Intelligence (Premium)
`GET /api/v1/analytics/market-intelligence?marketIds=...`

Returns:
- per‑market trade stats
- volume anomalies
- correlation metrics
- unusual activity

### 5) Personalized Signals (NFT holder)
`GET /api/v1/analytics/personalized-signals?marketId=...`

Returns:
- signal (buy/sell/hold)
- confidence and risk score
- entry/exit guidance

## Full Example (Dev Bypass)

### Step 1: Challenge
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/challenge \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"inj1youraddress"}'
```
![Demo](./public/1.png)



### Step 2: Verify Identity (dev bypass)
```bash
curl -s -X POST http://localhost:3000/api/v1/verify-identity \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress":"inj1testaddress",
    "signature":"dev-bypass",
    "message":"PASTE_MESSAGE_HERE",
    "nftClassId":"n1nj4",
    "nftId":"1"
  }'
```

Copy `accessToken` from the response.

### Step 3: Call Analytics
```bash
curl -s "http://localhost:3000/api/v1/analytics/advanced-orderbook?marketId=MARKET_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## How To Get a Market ID
Use the Injective indexer API to list markets:

```bash
node -e "const { IndexerGrpcSpotApi } = require('@injectivelabs/sdk-ts'); const { getNetworkEndpoints, Network } = require('@injectivelabs/networks'); (async () => { const api = new IndexerGrpcSpotApi(getNetworkEndpoints(Network.Mainnet).indexer); const markets = await api.fetchMarkets(); console.log(markets[0]); })();"
```

The output includes `marketId`.

## Tiered Access Model
- `unverified`: blocked from gated analytics
- `nftHolder`: access to `advanced-orderbook` and `personalized-signals`
- `premium`: access to all endpoints

## Rate Limiting
- `unverified`: 10 req/min
- `nftHolder`: 100 req/min
- `premium`: 1000 req/min

## Project Structure
```
src/
  auth/
    verifySignature.ts
  analytics/
    orderbookAnalyzer.ts
    marketIntelligence.ts
    signalGenerator.ts
  injective/
    nftClient.ts
    indexerClient.ts
    network.ts
  middleware/
    authMiddleware.ts
    rateLimiter.ts
  routes/
    identity.ts
    analytics.ts
  index.ts
```

## Security Notes
- JWTs expire after 24 hours.
- Nonces are stored in Redis with short TTL to prevent replay.
- Signature verification is required in production (dev bypass only).

## Demo Tips (Contest)
- Show challenge → verify → analytics flow.
- Explain that `x/nft` verifies real ownership on-chain.
- Highlight computed metrics (not raw orderbook pass-through).
- Mention tiered access and rate limits as product logic.

