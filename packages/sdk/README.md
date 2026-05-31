# @ciphermarket/sdk

Framework-agnostic TypeScript SDK for CipherMarket, a privacy-preserving prediction market protocol with CoFHE-encrypted positions, FPMM pricing, oracle resolution, redemption, and Reineira dispute escrow.

## Why CipherMarket?

CipherMarket is a prediction market protocol built around encrypted user positions.

Unlike traditional prediction markets where positions and balances are publicly visible, CipherMarket keeps user holdings encrypted while preserving on-chain settlement, liquidity, oracle resolution, and dispute mechanisms.

The SDK provides a unified interface for:

- market discovery
- quote generation
- trade execution
- encrypted portfolio reveal
- oracle disputes
- redemption workflows

## Install

```bash
pnpm add @ciphermarket/sdk viem @cofhe/sdk
```

`viem` and `@cofhe/sdk` are peer dependencies. The SDK does not include wallet UI, React hooks, RainbowKit, wagmi, or Next.js.

## Requirements

- Node.js 20+
- pnpm 10+
- viem
- `@cofhe/sdk`
- deployed CipherMarket contract addresses

## Supported Networks

| Network | Chain ID |
| --- | ---: |
| Arbitrum Sepolia | 421614 |

Additional deployments will be added in future releases.

## Quick Start

```ts
import { createCipherMarketClient } from '@ciphermarket/sdk';

const client = createCipherMarketClient({
  chainId: 421614,
  publicClient,
  walletClient,
  cofheClient,
  account,
  addresses: {
    oracleRegistry: '0x...',
    predictionMarket: '0x...',
    reineiraDisputeEscrowAdapter: '0x...',
    usdc: '0x...',
  },
});

const markets = await client.markets.list();
console.log(markets);
```

## Architecture

```text
Application
     |
     v
@ciphermarket/sdk
     |
  +--+-------------+
  |  |             |
  v  v             v
Viem CoFHE   CipherMarket
Client Client  Contracts
```

Your app owns wallet connection, UI state, notifications, and data caching. The SDK owns protocol reads, write helpers, CoFHE flow helpers, ABI exports, and normalization utilities.

## Create a Client

```ts
import { createCipherMarketClient } from '@ciphermarket/sdk';

const cipherMarket = createCipherMarketClient({
  chainId: 421614,
  publicClient,
  walletClient,
  cofheClient,
  account,
  addresses: {
    oracleRegistry: '0x...',
    predictionMarket: '0x...',
    reineiraDisputeEscrowAdapter: '0x...',
    usdc: '0x...',
  },
});
```

Consumers provide their own viem clients, wallet connection, CoFHE client, account, and deployed addresses.

## Read Markets

```ts
const markets = await cipherMarket.markets.list();

const market = await cipherMarket.markets.get(1);

const pools = await cipherMarket.markets.getPools(
  1,
  Number(market.outcomeCount),
);
```

Market summaries include normalized lifecycle labels, collateral symbols, reserves, probabilities, liquidity, trade volume, dispute status, and finalized outcome data.

Example market summary shape:

```ts
type MarketSummary = {
  marketId: number;
  title: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RESOLUTION_OPEN' | 'ESCALATED' | 'FINALIZED';
  collateralSymbol: string;
  totalLiquidity: bigint;
  tradeVolume: bigint;
  outcomeCount: number;
  finalOutcomeIndex: number | null;
  outcomes: Array<{
    label: string;
    outcomeIndex: number;
    probability: bigint;
    reserve: bigint;
  }>;
};
```

## Quote Trades

```ts
const buyQuote = await cipherMarket.quotes.buy({
  marketId: 1,
  outcomeIndex: 0,
  amount: 5_000_000n, // 5 USDC
});

const sellQuote = await cipherMarket.quotes.sell({
  marketId: 1,
  outcomeIndex: 0,
  amount: 2_000_000n, // 2 shares
});
```

Quote result shape:

```ts
type QuotePreview = {
  outcomeIndex: number;
  side: 'BUY' | 'SELL';
  collateralAmount: bigint;
  sharesAmount: bigint;
  feeAmount: bigint;
  averagePrice: bigint;
  slippageBps: number;
  postTradeProbabilities: bigint[];
};
```

## Buy and Sell

```ts
await cipherMarket.trading.buyShares({
  marketId: 1,
  outcomeIndex: 0,
  collateralAmount: 5_000_000n,
  minSharesOut: buyQuote.sharesAmount,
  collateralToken: usdcAddress,
});

await cipherMarket.trading.sellShares({
  marketId: 1,
  outcomeIndex: 0,
  sharesIn: 2_000_000n,
  minCollateralOut: sellQuote.collateralAmount,
});
```

`buyShares` handles ERC20 approval when needed. `sellShares` reads the encrypted position handle, requests a CoFHE decrypt-for-transaction result, and submits the verified signature to the contract.

## Reveal Portfolio

```ts
const positions = await cipherMarket.portfolio.revealPositions(
  markets,
  account,
);

const redeemable = cipherMarket.portfolio.getRedeemable(
  markets,
  positions,
);

const realized = await cipherMarket.portfolio.getRealized(
  markets,
  account,
);
```

Portfolio helpers support encrypted share reveal, remaining invested amount, redeemable finalized markets, and realized redemption history.

Example position shape:

```ts
type RevealedPortfolioPosition = {
  marketId: number;
  outcomeIndex: number;
  shares: bigint;
  investedAmount: bigint;
};
```

## Redeem Winning Shares

```ts
const receipt = await cipherMarket.redemption.redeemWinningShares({
  marketId: 1,
  finalOutcomeIndex: 0,
});

console.log(receipt.hash, receipt.amount);
```

Redemption uses CoFHE `decryptForTx` and verifies the signed decrypted winning balance on-chain.

## Disputes

Direct custody dispute:

```ts
await cipherMarket.disputes.openDirect({
  marketId: 1,
  counterOutcomeIndex: 1,
  stakeAmount: 10_000_000n,
  collateralToken: usdcAddress,
});
```

Reineira escrow dispute:

```ts
await cipherMarket.disputes.openWithReineira({
  marketId: 1,
  counterOutcomeIndex: 1,
  stakeAmount: 10_000_000n,
  collateralToken: usdcAddress,
});
```

Reineira disputes are intended for USDC markets. Users fund with USDC, Reineira handles encrypted cUSDC internally, and the adapter unwraps back to USDC on settlement.

## Error Handling

SDK methods throw standard JavaScript errors.

```ts
try {
  await cipherMarket.trading.buyShares({
    marketId: 1,
    outcomeIndex: 0,
    collateralAmount: 5_000_000n,
    collateralToken: usdcAddress,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
}
```

Common error categories:

- missing contract address
- missing wallet client
- invalid trade amount
- wallet rejected transaction
- insufficient balance
- market closed
- invalid outcome
- slippage exceeded
- CoFHE connection failed
- CoFHE decryption failed
- Reineira escrow creation or funding failed

## Example: Telegram Bot

The SDK is framework-agnostic and can be used inside Telegram bots, backend services, trading agents, dashboards, and web applications.

```ts
const markets = await cipherMarket.markets.list();

const topMarkets = markets
  .sort((a, b) => Number(b.tradeVolume - a.tradeVolume))
  .slice(0, 5);

for (const market of topMarkets) {
  console.log(`${market.title}: ${market.collateralSymbol}`);
}
```

For bot v1, prefer read-only flows and deep links back to the web app for buy, sell, redeem, and dispute actions.

## Utility Exports

```ts
import {
  PREDICTION_MARKET_ABI,
  REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
  computeProbabilitiesFromReserves,
  formatTokenAmount,
  normalizeCtHash,
  isZeroCtHash,
} from '@ciphermarket/sdk';
```

The SDK exports ABIs, shared types, collateral helpers, FPMM probability math, formatters, CoFHE helpers, and contract error formatting.

## Package Status

This is the first public SDK release. The API is usable for integrations today, but still expected to evolve as CipherMarket adds more consumers such as the planned Telegram read/alerts bot.

Recommended integration pattern:

- use the SDK for protocol reads/writes
- keep wallet connection and UI state in your app
- pass viem clients and CoFHE client into `createCipherMarketClient`
- deep-link sensitive actions if your integration is not a full wallet-enabled app

## Development

From the repo root:

```bash
pnpm --filter @ciphermarket/sdk test
pnpm --filter @ciphermarket/sdk typecheck
pnpm --filter @ciphermarket/sdk build
```

Before publishing:

```bash
pnpm --filter @ciphermarket/sdk publish --dry-run --access public --no-git-checks
```

## License

MIT
