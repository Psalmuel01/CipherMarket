# CipherMarket Telegram Bot

CipherMarket Signal Bot is a read, alerts, and deep-link Telegram bot for CipherMarket markets.

V1 does not custody wallets or sign transactions. It helps users discover markets, inspect odds, request quotes, watch market lifecycle changes, and open the CipherMarket web app for wallet-signed actions.

## Bot Profile

Suggested BotFather setup:

- Name: `CipherMarket Signal Bot`
- Username: `ciphermarket_signal_bot` or another available CipherMarket handle
- Description: `Privacy-preserving prediction market alerts, quotes, and market discovery for CipherMarket on Arbitrum Sepolia.`
- About: `Browse markets, check odds, watch resolution events, and open CipherMarket for wallet-signed trading and redemption.`

Suggested command menu:

```text
start - Open the CipherMarket bot menu
help - Show commands
markets - List markets
market - Show market details and odds
quote - Preview a buy quote
watch - Watch a market
unwatch - Stop watching a market
watchlist - List watched markets
redeemable - Show finalized markets to check
status - Bot health
info - Project summary and roadmap
```

## Setup

1. Create a bot with BotFather and copy the token.
2. Copy `.env.example` to `.env`.
3. Fill in:

```bash
TELEGRAM_BOT_TOKEN=
ARBITRUM_SEPOLIA_RPC_URL=
NEXT_PUBLIC_APP_URL=
PREDICTION_MARKET_ADDRESS=
ORACLE_REGISTRY_ADDRESS=
REINEIRA_DISPUTE_ESCROW_ADAPTER_ADDRESS=
USDC_ADDRESS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ALERT_POLL_INTERVAL_MS=60000
```

4. Run `supabase/telegram_watch_subscriptions.sql` in Supabase.
5. Start the bot:

```bash
pnpm --filter telegram-bot dev
```

## Commands

- `/markets` lists the latest markets with buttons for quick inspection.
- `/market` opens a market picker; `/market <id>` shows status, collateral, liquidity, volume, outcomes, and app buttons.
- `/quote` opens a market picker; `/quote <id> <YES|NO|index> <amount>` previews a buy quote.
- `/watch` opens a market picker; `/watch <id>` subscribes the chat to market lifecycle alerts.
- `/unwatch` opens watched-market buttons; `/unwatch <id>` removes a watch.
- `/watchlist` lists watched markets.
- `/redeemable <wallet>` lists finalized markets that should be checked in the app.
- `/info` summarizes the project and what is coming next.
- `/status` confirms RPC, market count, and watch storage mode.

Categorical markets render compact action buttons for every outcome. Finalized markets hide buy, sell, and quote actions and show redemption/open/watch actions instead.

## Deployment Notes

The bot can run anywhere that supports a long-running Node process. Railway is a good fit.

Use:

```bash
pnpm --filter telegram-bot build
pnpm --filter telegram-bot start
```

The bot package currently uses the local SDK package through `file:../sdk`, which keeps Railway-style package deployment self-contained inside this monorepo. If the SDK is consumed from npm later, switch this dependency to the published `@ciphermarket/sdk` version.

## Limits

V1 does not buy, sell, redeem, create markets, or register oracles directly inside chat. Those actions require wallet signatures and open the web app through deep links.
