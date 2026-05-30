# CipherMarket

CipherMarket is a privacy-first prediction market built for Ethereum Sepolia.

The product combines a share-based market engine, oracle-driven resolution, and an FHE-backed user experience so traders can participate through a cleaner, more confidential market interface.

## Overview

CipherMarket is organized as a pnpm monorepo with two workspaces:

- `contracts` — Solidity contracts, Hardhat config, deployment scripts, and tests
- `frontend` — Next.js 14 application, wallet integration, trading flows, and product UI

## Product Surfaces

The frontend currently includes:

- landing page
- market dashboard
- market detail and trading view
- create market flow
- oracle dashboard
- positions page

## Smart Contracts

Current core contracts:

- `OracleRegistry.sol`
  Handles oracle registration, stake management, proposal locks, and slashing

- `PredictionMarket.sol`
  Singleton market manager that supports:
  - binary and categorical markets
  - seeded liquidity initialization
  - ETH or whitelisted ERC20 collateral
  - FPMM-based pricing
  - optimistic oracle proposal and disputes
  - encrypted user balance handling

## Tech Stack

### Contracts

- Solidity `0.8.25`
- Hardhat `2.22.19`
- `@fhenixprotocol/cofhe-contracts`
- `cofhe-hardhat-plugin`

### Frontend

- Next.js `14`
- React `18`
- TypeScript
- Tailwind CSS
- wagmi
- viem
- Zustand
- React Query
- `@cofhe/sdk`
- `@cofhe/react`
- Framer Motion
- Sonner

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm dev:frontend
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Frontend environment values live in [`frontend/.env.local`](/Users/sam/Desktop/Fhenix/CipherMarket/frontend/.env.local).

Required Sepolia values:

```bash
NEXT_PUBLIC_SEPOLIA_ORACLE_REGISTRY=...
NEXT_PUBLIC_SEPOLIA_PREDICTION_MARKET=...
NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

Optional Supabase values for market discussions:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Run [`supabase/market_comments.sql`](/Users/sam/Desktop/Fhenix/CipherMarket/supabase/market_comments.sql) in Supabase before enabling those values.

If you are deploying contracts and want USDC whitelisted during deployment:

```bash
SEPOLIA_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

## Development Commands

Run frontend linting:

```bash
pnpm lint
```

Run all tests:

```bash
pnpm test
```

Run contract tests only:

```bash
pnpm test:contracts
```

Build the workspaces:

```bash
pnpm build
```

Frontend-only checks:

```bash
pnpm --filter frontend lint
pnpm --filter frontend test
NEXT_IGNORE_INCORRECT_LOCKFILE=1 pnpm --filter frontend build
```

Contracts-only checks:

```bash
pnpm --filter contracts compile
pnpm --filter contracts test
```

## Deployment

Deploy from the contracts workspace:

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network sepolia
```

The deployment flow:

- deploys `OracleRegistry`
- deploys `PredictionMarket`
- wires the registry to the market contract
- optionally whitelists Sepolia USDC when `SEPOLIA_USDC_ADDRESS` is set

## Repository Layout

```text
ciphermarket/
├── contracts/
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.ts
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── store/
│   │   └── types/
│   └── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Notes

- Solidity is pinned to `0.8.25` for compatibility with the current CoFHE stack.
- ABI files are kept in `frontend/src/lib/abi/` so the frontend stays aligned with deployed contracts.
- Sepolia is the primary target network for this phase of the project.
