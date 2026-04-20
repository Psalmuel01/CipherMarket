# CipherMarket

CipherMarket is a privacy-native prediction market on Ethereum Sepolia.

It uses a singleton share-market contract with a public FPMM pool and encrypted per-user balances:

- public: reserves, probabilities, prices, lifecycle state
- private: cumulative per-user positions

That is the repo’s honest v1 privacy boundary.

## Workspaces

- `contracts` — Hardhat + Solidity contracts
- `frontend` — Next.js 14 app

## Current Contract Model

- `OracleRegistry.sol`
  Oracle registration, staking, proposal locks, and slashing

- `PredictionMarket.sol`
  Singleton FPMM market manager with:
  - binary and categorical markets
  - total seed liquidity split equally across outcomes
  - ETH or whitelisted ERC20 collateral
  - optimistic oracle proposal + dispute window
  - encrypted per-user balances
  - public pool-level pricing state

## Network And Collateral

- Primary network: Ethereum Sepolia
- Real Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Mock USDC is no longer part of the frontend/product flow

Add these to [`frontend/.env.local`](/Users/sam/Desktop/Fhenix/CipherMarket/frontend/.env.local):

```bash
NEXT_PUBLIC_SEPOLIA_ORACLE_REGISTRY=...
NEXT_PUBLIC_SEPOLIA_PREDICTION_MARKET=...
NEXT_PUBLIC_SEPOLIA_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

For contract deployment whitelisting:

```bash
SEPOLIA_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
```

## Start The Frontend

```bash
pnpm install
pnpm dev:frontend
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

Frontend:

```bash
pnpm --filter frontend lint
pnpm --filter frontend test
NEXT_IGNORE_INCORRECT_LOCKFILE=1 pnpm --filter frontend build
```

Contracts:

```bash
pnpm --filter contracts compile
pnpm --filter contracts test
```

## Deployment

Deploy the contracts:

```bash
cd contracts && npx hardhat run scripts/deploy.ts --network sepolia
```

The deploy script:

- deploys `OracleRegistry`
- deploys `PredictionMarket`
- wires `OracleRegistry.setPredictionMarket(...)`
- whitelists `SEPOLIA_USDC_ADDRESS` when configured

## Frontend Coverage

The app currently includes:

- landing page
- dashboard
- market detail with lifecycle-specific UX
- create market flow
- oracle dashboard
- private portfolio page
- in-app docs page at `/docs`

## Important Notes

- Solidity is pinned to `0.8.25` because of the current CoFHE-compatible stack.
- Pool state remains public by design in v1.
- Per-user holdings are encrypted and revealed locally through CoFHE-backed view flows.
- Sell and redeem take an extra verification step because they depend on private balance confirmation.
