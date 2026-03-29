# CipherMarket

CipherMarket is a privacy-native prediction market built on Fhenix CoFHE.

The repo currently has a revamped frontend demo flow plus the original CoFHE smoke-test
contract workspace. The UI covers more of the product journey than the contract layer does today.

## Workspaces

- `contracts`: Hardhat + Solidity smart contracts
- `frontend`: Next.js 14 application shell

## Current Status

- Frontend routes now cover landing, dashboard, market detail, create-market, oracle, and my-bets
- `FHESmoke.sol` is still the only Solidity contract implemented
- Frontend hooks remain mostly demo/mock state rather than live on-chain reads and writes
- Localhost deployment flow exists for the smoke-test contract only

## Locked Stack

- Solidity `0.8.25`
- Hardhat `2.22.19`
- `cofhe-hardhat-plugin` `0.3.1`
- `@fhenixprotocol/cofhe-contracts` `0.0.13`
- `@fhenixprotocol/cofhe-mock-contracts` `0.3.1`
- Next.js `14.2.35`
- React `18.3.1`
- wagmi `2.19.5`

## Important Caveats

- Solidity is pinned to `0.8.25`, not `0.8.24`. The current working CoFHE contract stack used in
  this repo requires `>=0.8.25`.
- Phase 1 uses Ethereum Sepolia as the secondary configured network while localhost remains the
  primary development target.
- The frontend keeps a cross-workspace ABI import from `contracts/artifacts` for Phase 1. If this
  becomes brittle in Phase 2, replace it with a shared package or generated ABI export step.
- `@cofhe/react` remains in the provider stack and its floating UI is intentionally suppressed at
  the shell layer via the global `fnx-` CSS rule.

## Start The Frontend

```bash
pnpm install
pnpm dev:frontend
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm --filter frontend test
```

## Smart Contracts

- Compile and test the current contract workspace:

```bash
pnpm --filter contracts compile
pnpm --filter contracts test
```

- Run the local contract stack:

```bash
pnpm --filter contracts node
pnpm --filter contracts deploy:localhost
```

## What Is Actually Implemented

- `FHESmoke.sol` verifies CoFHE wiring, encrypted storage, and encrypted addition
- The prediction-market contracts from the product flow are not built yet:
  - `OracleRegistry`
  - `MarketFactory`
  - `PredictionMarket`
  - `DisputeResolver`
- The frontend currently demonstrates the updated product flow with mocked hooks and local demo state

## Repo Shape

```text
ciphermarket/
├── contracts/
│   ├── contracts/
│   │   └── FHESmoke.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── FHESmoke.test.ts
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
└── README.md
```
