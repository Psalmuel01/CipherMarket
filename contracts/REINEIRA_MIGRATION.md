# Reineira Adapter Migration

This migration deploys a new `ReineiraDisputeEscrowAdapter` with the funded-then-activated dispute flow and keeps the legacy adapter whitelisted until open escrows are settled.

## Why migrate

The legacy adapter opened disputes at Reineira `create()` time, before `fund()` completed. The new adapter:

1. stores escrow metadata in `onConditionSet`
2. waits for Reineira funding via `getPaidAmount`
3. opens the market dispute in `activateDispute`
4. requires `settleEscrow` after finalization to release USDC

## Deploy the new adapter

```bash
cd contracts
npx hardhat run scripts/migrate-reineira-adapter.ts --network arbitrum-sepolia
```

Required env in `contracts/.env`:

- `PRIVATE_KEY`
- `ARBITRUM_SEPOLIA_RPC_URL`
- optional `PREDICTION_MARKET_ADDRESS`
- optional `LEGACY_REINEIRA_ADAPTER_ADDRESS`
- optional `REINEIRA_ESCROW_ADDRESS`

The script will:

1. deploy the new adapter against the existing `PredictionMarket` and Reineira escrow
2. keep the legacy adapter whitelisted
3. whitelist the new adapter
4. update `contracts/deployed-addresses.json`

## Frontend / SDK env

Point the app and SDK at the new adapter:

```bash
NEXT_PUBLIC_ARBITRUM_SEPOLIA_REINEIRA_DISPUTE_ESCROW_ADAPTER=<new adapter address>
```

The SDK resolves per-market adapter addresses from `PredictionMarket.marketDisputeAdapter`, so finalized disputes opened through the legacy adapter can still be settled against the legacy adapter address until those escrows are cleared.

## Settle legacy escrows

For any finalized market that used the legacy adapter:

1. read `legacyAdapter.marketEscrowId(marketId)`
2. call `legacyAdapter.settleEscrow(escrowId)`
3. confirm USDC moved to the disputer or `PredictionMarket`

You can also use the app/SDK settle button; it resolves the adapter from `marketDisputeAdapter(marketId)`.

## Disable the legacy adapter

After all legacy escrows are settled:

```bash
cast send <predictionMarket> "setDisputeAdapter(address,bool)" <legacyAdapter> false --rpc-url $ARBITRUM_SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

## Current addresses

See `contracts/deployed-addresses.json` for:

- `reineiraAdapter` — active adapter used by the frontend
- `reineiraAdapterLegacy` — previous adapter kept during migration
