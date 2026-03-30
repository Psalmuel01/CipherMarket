# **CipherMarket**

CipherMarket is a privacy-first prediction market built on Fhenix CoFHE.

It lets users create markets, place bets, and claim winnings without exposing their positions on-chain. The current repo includes a working frontend flow and a functional contract layer, with the UI covering more of the full product experience than the contracts do today.

---

## **Project Structure**

This repo is split into two main workspaces:

* `contracts` — Hardhat + Solidity smart contracts
* `frontend` — Next.js 14 application

---

## **Current Status**

* Core contracts implemented:

  * `OracleRegistry`
  * `PredictionMarket` (with tests)
* Frontend includes full product flow:

  * Landing
  * Dashboard
  * Market detail
  * Create market
  * Oracle panel
  * My bets
* ABI files stored locally in `frontend/src/lib/abi/` for portability
* Supports Sepolia testnet
* Local deployment flow works end-to-end

---

## **Tech Stack**

### Smart Contracts

* Solidity `0.8.25`
* Hardhat `2.22.19`
* `@fhenixprotocol/cofhe-contracts`
* `cofhe-hardhat-plugin`

### Frontend

* Next.js `14`
* React `18`
* wagmi `v2`
* viem
* Tailwind CSS
* Zustand

---

## **Important Notes**

* Solidity is pinned to `0.8.25`. Earlier versions will break the CoFHE setup.
* Sepolia is the primary network. No local Hardhat network is configured.
* ABI files are committed for convenience and deployment portability.

To regenerate ABIs:

```bash
mkdir -p frontend/src/lib/abi && \
for f in contracts/artifacts/contracts/**/*.json; do \
  jq '{abi: .abi}' "$f" > "frontend/src/lib/abi/$(basename "$f")"; \
done
```

* `@cofhe/react` is included in the provider stack, but its default UI is suppressed via global CSS.

---

## **Getting Started**

### Install dependencies

```bash
pnpm install
```

---

### Run the frontend

```bash
pnpm dev:frontend
```

Open: [http://localhost:3000](http://localhost:3000)

---

## **Development**

### Linting & tests

```bash
pnpm lint
pnpm --filter frontend test
```

---

### Smart contracts

Compile and test:

```bash
pnpm --filter contracts compile
pnpm --filter contracts test
```

---

## **Implemented Features**

### Contracts

* `OracleRegistry.sol`
  Handles oracle registration, staking, and slashing

* `PredictionMarket.sol`
  Supports binary and categorical markets with dispute and resolution logic

* `MockUSDC.sol`
  ERC20 mock token for testing collateral

---

### Frontend

* Full UI flow across all major product surfaces
* Hooks for:

  * Market creation
  * Betting
  * Oracle participation
  * Disputes
* Wallet integration via wagmi (Sepolia + localhost)

---

## **Repository Layout**

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

