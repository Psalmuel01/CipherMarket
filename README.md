# CipherMarket

CipherMarket is a privacy-first prediction market protocol on Arbitrum Sepolia. It combines an FPMM share market, CoFHE-encrypted user positions, oracle-driven resolution, Reineira dispute escrow, and a TypeScript protocol SDK.

At the pool level, markets stay transparent enough for honest quotes: reserves, probabilities, liquidity, volume, and lifecycle state are public. At the user level, positions are encrypted so a wallet's outcome exposure is not visible from contract storage.

## Workspaces

CipherMarket is a pnpm monorepo:

- `contracts` — Solidity contracts, Hardhat config, deployment scripts, tests, and generated artifacts
- `frontend` — Next.js app, wallet flows, trading UI, oracle dashboard, portfolio, and docs
- `packages/sdk` — framework-agnostic `@ciphermarket/sdk` package for protocol integrations

## Current Product Surface

- Market dashboard with mixed ETH/USDC liquidity and volume stats
- Market detail pages with FPMM quotes, buy/sell flows, LP actions, resolution status, and redemption
- Private position reveal through CoFHE `decryptForView`
- Sell and redeem flows using CoFHE `decryptForTx` signatures verified on-chain
- Per-outcome total invested tracking with sell-side cost-basis reduction
- Settled portfolio history with claimable shares, redeemed payout, remaining invested, and net after cost
- Oracle registry, proposal, dispute, voting, escalation, and finalization flows
- Reineira dispute escrow for confidential USDC dispute bonds
- Supabase-backed market comments/likes for discussion
- Protocol SDK for app, bot, and partner integrations

## Smart Contracts

- `OracleRegistry.sol`
  Handles oracle registration, ETH stake accounting, proposal locks, and slashing.

- `PredictionMarket.sol`
  Singleton market manager with binary/categorical markets, ETH or whitelisted ERC20 collateral, FPMM quotes, encrypted user balances, oracle resolution, disputes, LP accounting, trade volume, invested-basis tracking, and realized redemption history.

- `ReineiraDisputeEscrowAdapter.sol`
  Bridges PredictionMarket disputes into Reineira escrow. Users fund with USDC, Reineira operates with encrypted cUSDC internally, and settlement unwraps back to USDC before forwarding/refunding.

## Protocol SDK

The local SDK package is `@ciphermarket/sdk` in `packages/sdk`. It is usable inside this workspace today and publish-ready, but it has not been published to npm yet.

It exports:

- `createCipherMarketClient(...)`
- ABI exports and chain/address helpers
- market list/get/pool helpers
- buy/sell quote normalization
- buy/sell/redeem transaction helpers
- CoFHE handle, permit, `decryptForView`, and `decryptForTx` helpers
- portfolio reveal, invested amount, realized payout, and redeemable helpers
- direct and Reineira dispute helpers
- formatting and probability math utilities

Example:

```ts
import { createCipherMarketClient } from '@ciphermarket/sdk';

const client = createCipherMarketClient({
  chainId,
  publicClient,
  walletClient,
  cofheClient,
  account,
  addresses,
});

const markets = await client.markets.list();
const quote = await client.quotes.buy({
  marketId: 1,
  outcomeIndex: 0,
  amount: 5_000_000n,
});
```

See the in-app SDK guide at `/docs/sdk`.

## Telegram Bot Roadmap

The next planned package is a read/alerts Telegram bot powered by the SDK:

- `/markets` to browse active markets
- `/market <id>` for market details and odds
- `/watch <id>` for expiry/resolution alerts
- `/redeemable <address>` for claimable winning shares
- deep links back into the web app for buy/sell/redeem actions

Direct in-Telegram trading is intentionally out of scope for v1 because wallet signing and CoFHE permit flows should remain explicit and user-controlled.

## Tech Stack

### Contracts

- Solidity `0.8.25`
- Hardhat `2.22.19`
- `@fhenixprotocol/cofhe-contracts`
- OpenZeppelin
- ethers v6

### Frontend

- Next.js `14`
- React `18`
- TypeScript
- Tailwind CSS
- wagmi
- viem
- React Query
- Zustand
- `@cofhe/sdk`
- `@cofhe/react`
- Framer Motion
- Sonner

### SDK

- TypeScript
- ESM package output
- viem peer dependency
- `@cofhe/sdk` peer dependency
- Vitest unit tests

## Environment

Frontend environment values live in `frontend/.env.local`.

Required Arbitrum Sepolia values:

```bash
NEXT_PUBLIC_ARBITRUM_SEPOLIA_ORACLE_REGISTRY=...
NEXT_PUBLIC_ARBITRUM_SEPOLIA_PREDICTION_MARKET=...
NEXT_PUBLIC_ARBITRUM_SEPOLIA_REINEIRA_DISPUTE_ESCROW_ADAPTER=...
NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDC_ADDRESS=...
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=...
```

Optional Supabase values for market comments and likes:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Contracts environment values live in `contracts/.env`.

Common deployment values:

```bash
ARBITRUM_SEPOLIA_RPC_URL=...
PRIVATE_KEY=...
ARBISCAN_API_KEY=...
USDC_ADDRESS=...
REINEIRA_ESCROW_ADDRESS=...
```

## Development

Install dependencies:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm dev:frontend
```

Run common checks:

```bash
pnpm lint
pnpm test
pnpm build
```

Focused checks:

```bash
pnpm --filter @ciphermarket/sdk test
pnpm --filter @ciphermarket/sdk typecheck
pnpm --filter @ciphermarket/sdk build
pnpm --filter contracts compile
pnpm --filter contracts test
pnpm --filter frontend lint
pnpm --filter frontend build
```

## Deployment

Deploy from the contracts workspace:

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network arbitrum-sepolia
```

After deployment:

- update `contracts/deployed-addresses.json`
- update `frontend/.env.local`
- ensure the Reineira adapter address is allowed on `PredictionMarket`
- copy or regenerate frontend/SDK ABIs from current artifacts
- restart the frontend dev server

## Repository Layout

```text
ciphermarket/
├── contracts/
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   └── package.json
├── frontend/
│   ├── src/app/
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/lib/
│   └── package.json
├── packages/
│   └── sdk/
│       ├── src/
│       ├── test/
│       └── package.json
├── supabase/
├── pnpm-workspace.yaml
└── README.md
```

## Current SDK Status

The SDK is ready for local consumers in this monorepo. A third party can integrate today by using the package source or a git/workspace dependency, but normal `npm install @ciphermarket/sdk` requires publishing the package first.
