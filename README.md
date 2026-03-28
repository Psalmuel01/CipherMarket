# CipherMarket

CipherMarket is a privacy-native prediction market built on Fhenix CoFHE.

Phase 1 delivers the monorepo foundation, a verified CoFHE smoke-test contract, and a
production-styled Next.js shell for the dApp.

## Workspaces

- `contracts`: Hardhat + Solidity smart contracts
- `frontend`: Next.js 14 application shell

## Phase 1 Status

- Monorepo scaffolded with `pnpm` workspaces
- `FHESmoke.sol` implemented, compiled, and covered by contract tests
- Next.js shell implemented with shared providers, wallet entry point, and dark terminal UI
- Localhost deployment flow wired through Hardhat scripts

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

## Getting Started

```bash
pnpm install
pnpm --filter contracts compile
pnpm --filter contracts test
pnpm --filter frontend lint
pnpm --filter frontend test
```

## Local Development

Start the local Hardhat chain:

```bash
pnpm --filter contracts node
```

Deploy `FHESmoke` to localhost in a second terminal:

```bash
pnpm --filter contracts deploy:localhost
```

Start the frontend in a third terminal:

```bash
pnpm --filter frontend dev
```

Open `http://localhost:3000` to view the CipherMarket shell.

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
