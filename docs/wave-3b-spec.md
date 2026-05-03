# Wave 3B Spec: Public LP

Wave 3B is defined by the roadmap in [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md). This spec locks the public-LP accounting model that sits on top of the Wave 3A committee-resolution baseline.

## Goal

Open liquidity provision beyond the market creator while preserving three things:

- price continuity for the FPMM
- solvency for trader redemptions
- deterministic LP settlement before and after resolution

## Locked Decisions

- LP shares are market-scoped and fungible within one market.
- LP shares are not transferable in Wave 3B. They are fungible only as an accounting unit for pro-rata ownership and payout math.
- The market creator receives the initial LP share supply at market creation.
- Additional LPs add liquidity only while the market is `ACTIVE`.
- LP removal is allowed only while the market is `ACTIVE`.
- After finalization, LPs do not remove liquidity through the active pool path; they claim a pro-rata final LP payout instead.
- LP share minting and burning use the market maker reserve value, not creator-specific accounting.

## LP Asset Value Model

Wave 3B uses the current reserve value of the market maker as the LP accounting base.

For an active market:

- `lpReserveValue = sum(poolBalances[marketId])`

This is the value that new LP deposits scale and existing LP withdrawals burn against.

The important property is that adding or removing liquidity proportionally against `lpReserveValue` preserves relative pool weights and therefore preserves prices.

## Minting LP Shares

At market creation:

- `totalLpShares = seedLiquidity`
- `lpShares[marketId][creator] = seedLiquidity`

For later LP deposits:

- `mintedShares = depositAmount * totalLpShares / lpReserveValue`

This keeps LP ownership proportional to the size of the reserve basket the depositor is joining.

## Add Liquidity

`addLiquidity(marketId, collateralAmount)`

Requirements:

- market must exist
- market must be `ACTIVE`
- collateral amount must be greater than zero
- native ETH vs ERC20 transfer rules must match the market collateral

Execution:

- calculate `lpReserveValue = sum(poolBalances)`
- calculate `mintedShares`
- scale every outcome reserve up proportionally by the same LP ratio
- increase `market.totalCollateralCollected` by `collateralAmount`
- mint LP shares to the provider

Reserve update rule:

- for each outcome `i`, compute `delta_i = floor(balance_i * collateralAmount / lpReserveValue)`
- sum every floored `delta_i`
- assign `collateralAmount - sum(delta_i)` to the final outcome bucket
- balances are updated proportionally so prices stay unchanged

This makes the rounding rule deterministic:

- in a 2-outcome market the residue goes to outcome index `1`
- in an 8-outcome market the residue goes to outcome index `7`

## Remove Liquidity

`removeLiquidity(marketId, lpSharesIn, minCollateralOut)`

Requirements:

- market must be `ACTIVE`
- caller must hold enough LP shares
- `lpSharesIn > 0`
- resulting withdrawal must satisfy `minCollateralOut`

Execution:

- `collateralOut = lpReserveValue * lpSharesIn / totalLpShares`
- scale every reserve down proportionally by the burned LP share ratio
- burn caller LP shares
- decrease `market.totalCollateralCollected` by `collateralOut`
- pay collateral to the caller

Reserve floor:

- after removal, the remaining LP reserve value must still be at least `minimumTrade * outcomeCount`
- this prevents an LP from draining an `ACTIVE` market into a state where trading is technically open but practically unusable

This keeps prices unchanged while reducing pool depth.

## Final LP Settlement

After `FINALIZED`, LPs claim the residual market value pro rata by LP shares.

`claimLpPayout(marketId)`

Requirements:

- market must be `FINALIZED`
- caller must hold LP shares

Payout base:

- `lpPayoutBase = market.totalCollateralCollected - reservedWinningShares - reservedProtocolFees`

Where:

- `reservedWinningShares = market.remainingWinningShares`
- `reservedProtocolFees = 0` if protocol fees already claimed, otherwise `accruedProtocolFees[marketId]`

Payout:

- `payout = lpPayoutBase * callerLpShares / totalLpShares`

Then:

- burn caller LP shares
- reduce `totalLpShares`
- transfer payout

This replaces the old creator-only LP surplus claim.

Last claimer rule:

- if `callerLpShares == totalLpShares`, pay the remaining `lpPayoutBase` exactly
- this prevents rounding dust from becoming stranded on the final LP claim

## Views

Wave 3B adds:

- `getLpPosition(marketId, account) -> (lpShares, totalLpShares, reserveValue, estimatedActiveCollateralOut)`
- `getLpReserveValue(marketId) -> uint256`

`estimatedActiveCollateralOut` is a convenience view for the active-market remove path.
It includes fee income already accumulated into the pool, because LP share pricing is based on the current `lpReserveValue`.

This is intentional:

- new LPs buy in at the current LP share price
- that share price already reflects any LP fee income accumulated before they joined
- existing LPs are not diluted out of fees they already earned

## Events

- `LiquidityAdded(marketId, provider, collateralAmount, lpSharesMinted)`
- `LiquidityRemoved(marketId, provider, collateralAmount, lpSharesBurned)`
- `LpPayoutClaimed(marketId, recipient, amount, lpSharesBurned)`

## Tests

Wave 3B contract tests must cover:

- creator receives initial LP shares on market creation
- public LP deposit mints shares and preserves prices
- public LP removal burns shares and preserves prices
- multiple LPs receive pro-rata final payouts
- LP removal is blocked after expiry
- LP claims work after finalization
- rounding does not strand meaningful liquidity or break solvency
