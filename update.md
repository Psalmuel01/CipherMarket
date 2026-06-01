# CipherMarket Update

## Summary

CipherMarket has evolved from a private prediction market frontend into a fuller protocol stack: encrypted trading, oracle resolution, dispute escrow, portfolio accounting, discussion features, a framework-agnostic TypeScript SDK, and a Telegram bot integration.

## Major Updates

- Added Supabase-backed market discussions and likes so markets can carry social context without leaving the app.
- Upgraded the CoFHE flow for private balances:
  - portfolio viewing uses `decryptForView`
  - sell and redeem use `decryptForTx`
  - contracts verify decrypt results with `FHE.verifyDecryptResult`
- Fixed sell shares and redeem winning shares around the newer CoFHE authorization model.
- Added Reineira dispute escrow support for USDC dispute bonds:
  - users fund with USDC
  - Reineira handles encrypted cUSDC internally
  - settlement unwraps back to USDC before refunding or forwarding to the market
- Added direct custody dispute fallback for ETH markets and non-Reineira flows.
- Improved market lifecycle UX:
  - Active
  - Awaiting Resolution
  - In Resolution
  - Admin Review
  - Resolved
- Added oracle dashboard improvements for registration, voting, proposal, resolution, escalation, and rewards.
- Added per-outcome total invested tracking.
- Updated sell accounting so selling shares reduces invested basis proportionally.
- Added realized redemption tracking so a redeemed win does not disappear from portfolio history.
- Updated finalized market UX to avoid misleading “you won/lost” labels when users held multiple outcomes.
- Added settled portfolio history with claimable shares, redeemed payout, remaining invested, non-winning shares, and net after cost.
- Fixed redeemable portfolio logic so only winning outcome shares count as redeemable.
- Split dashboard stats correctly:
  - Sealed Liquidity is current locked collateral.
  - Aggregate Volume is cumulative buy/sell trade flow.
  - Mixed collateral totals render compactly by currency, such as `15 USDC · 1 ETH`.
- Removed the obsolete local `cofhe-lite` Hardhat shim so contracts compile without a missing local plugin file.
- Added Telegram deep links so market URLs can pre-open buy, sell, or redeem flows from external integrations.

## Protocol SDK

Added `@ciphermarket/sdk` as a new workspace package in `packages/sdk`.

The SDK is framework-agnostic and exports:

- `createCipherMarketClient`
- PredictionMarket, OracleRegistry, and Reineira adapter ABIs
- address and collateral helpers
- market list/get/pool helpers
- buy/sell quote helpers
- buy/sell/redeem transaction helpers
- CoFHE handle, permit, and decrypt helpers
- portfolio reveal, invested amount, realized payout, and redeemable helpers
- direct and Reineira dispute helpers
- formatters and FPMM probability math

The frontend now consumes the SDK for core protocol flows while keeping React Query, UI state, toasts, and pending transaction UX in the app layer.

## Telegram Bot V1

Added `packages/telegram-bot` as a read/alerts/deep-link bot powered by `@ciphermarket/sdk`.

The bot supports:

- `/markets` for market discovery
- `/market <id>` for market details, odds, liquidity, volume, and app buttons
- `/quote <id> <YES|NO|index> <amount>` for buy quote previews
- `/watch <id>`, `/unwatch <id>`, and `/watchlist` for lifecycle alerts
- `/redeemable <wallet>` for finalized markets to check in the app
- `/status` for network, market count, and watch storage status

The bot stores watch subscriptions in Supabase through `telegram_watch_subscriptions` and falls back to memory if Supabase is not configured. It does not custody wallets or sign transactions; buy, sell, redeem, and future create-market flows open the web app through deep links.

## Integration Status

The SDK can be used by local workspace consumers today and by the Telegram bot package. External teams can integrate by using a git/workspace dependency or the published package version.

Next publish step:

```bash
pnpm --filter @ciphermarket/sdk build
pnpm --filter @ciphermarket/sdk test
```

Then publish `packages/sdk` when package metadata and versioning are finalized.

## Validation

Recent checks completed successfully:

```bash
pnpm --filter @ciphermarket/sdk test
pnpm --filter @ciphermarket/sdk typecheck
pnpm --filter @ciphermarket/sdk build
pnpm --filter telegram-bot test
pnpm --filter telegram-bot build
pnpm --filter frontend lint
pnpm --filter frontend build
pnpm --filter contracts compile
pnpm run build
```

The frontend build still shows the known Next lockfile/SWC registry warning and existing webpack chunk warnings, but the build completes.

## Next Planned Update

Extend the SDK with market creation and oracle/resolution write helpers, then use those surfaces for a later Telegram Mini App or richer wallet-connected bot flow.
