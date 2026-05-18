# CipherMarket Roadmap

## Overview

CipherMarket is evolving from a strong privacy-native V1 into a more standard, credible prediction market with deeper oracle coordination, public liquidity, stronger settlement architecture, and a more complete product surface.

This roadmap is organized into waves so protocol work, product work, and infrastructure work can progress without cutting across each other unnecessarily.

Guiding principles:

- Keep the market mechanism legible and financially sound.
- Preserve private user positions as a core product property.
- Reduce trust in any single resolver over time.
- Add capital efficiency only after core solvency and accounting are solid.
- Build product surfaces that feel serious, operational, and understandable.

---

## Current Baseline

CipherMarket today includes:

- singleton prediction market architecture
- public FPMM pool state
- encrypted per-user positions
- market creation with ETH or Arbitrum Sepolia USDC
- private portfolio reveal flows
- oracle registration
- oracle proposal and dispute window
- admin fallback disputed resolution
- private market pages, portfolio, docs, and landing flows

This is a strong V1 foundation, but the next phases focus on making the protocol feel more standard, more decentralized in resolution, more capital-efficient, and more polished for real usage.

---

## Wave 3A: Oracle Committee and Resolution Upgrade

### Goal

Replace the current single-proposer plus admin-fallback resolution model with a more credible multi-oracle committee model.

### Decisions required before build

Wave 3A should not begin implementation until these two design choices are explicitly locked:

- voting visibility model: open voting vs commit-reveal voting
- quorum failure policy: what happens on tie, no-quorum, or fragmented outcomes

At minimum, the team should produce a short design note that chooses one path for each before contract work starts.

### Outcomes

- multiple registered oracles can participate in resolution
- votes are weighted by oracle stake
- quorum thresholds determine whether a market can finalize through oracle consensus
- disputes become explicit counter-outcome challenges rather than generic objections
- wrong disputers lose stake
- winning oracle side earns dispute rewards
- proposer slashing becomes rule-based, not discretionary by default
- admin becomes emergency fallback only

### Protocol changes

- add per-market oracle voting state
- add explicit counter-outcome dispute submissions
- add quorum thresholds and weighted vote accounting
- add tie handling and no-quorum fallback rules
- add proposer bond / proposer accountability rules
- route wrong-disputer stake to the winning oracle side plus protocol treasury
- allow oracle slashing only when the proposal is overturned or under clearly defined fault conditions

### Frontend changes

- oracle voting interface on disputed markets
- quorum progress indicator
- per-outcome vote weights
- counter-outcome dispute form
- clearer market resolution timeline
- admin-only fallback resolver panel for no-quorum or escalation cases

### Success criteria

- markets can resolve through oracle committee vote without relying on admin by default
- dispute outcomes are explicit and reviewable
- economic incentives align proposer, voter, and disputer behavior

---

## Wave 3B: Public LP

### Goal

Open liquidity provision beyond the market creator and turn LP participation into a proper product surface.

### Why before external capital routing

Public LP comes before any external LP capital routing because the base LP accounting, fee ownership, withdrawal rules, and settlement behavior need to be correct in-protocol before liquidity can be routed or optimized outside the core system.

### Outcomes

- public users can add liquidity to markets
- LP shares are minted and tracked per market
- fees accrue pro rata to LPs
- LP settlement is deterministic after finalization
- LP position management becomes part of the core product

### Protocol changes

- add per-market LP share accounting
- implement add-liquidity and remove-liquidity flows
- add fee accrual and LP ownership accounting
- define lifecycle-based withdrawal constraints
- support post-resolution LP settlement and claim flows

### Frontend changes

- add liquidity and remove liquidity flows
- LP dashboard for open markets
- LP position pages with:
  - deposited collateral
  - current share of pool
  - accrued fees
  - post-finalization surplus
- clearer LP risk disclosures

### Success criteria

- non-creators can fund markets safely
- LP value and fee accrual are visible and understandable
- LP claims and exits are predictable

---

## Wave 3C: Privara Dispute Bond Escrow

### Goal

Conditionally move dispute bond custody out of the prediction market contract and into dedicated escrow rails if external settlement validation succeeds.

### Why this matters

Today, dispute bonds sit inside the same system that manages trading collateral and payout state. Externalizing dispute bond escrow can reduce accounting complexity and narrow the blast radius of bugs in the core market contract.

### Outcomes

- dispute bonds can be held outside `PredictionMarket`
- CipherMarket remains the source of truth for market state and final outcome
- bond release, refund, or forfeiture is driven by finalized market state

### Privara fit

Privara is not the resolution engine. It is a candidate settlement and escrow layer for:

- dispute bonds
- conditional release
- refund/forfeit routing after finalization

### Protocol changes

- replace direct internal dispute stake custody with optional external escrow references
- add settlement hooks or reference storage for escrow-backed disputes
- preserve a native fallback path if external escrow is unavailable

### Frontend changes

- dispute flow showing escrow creation and status
- refund / forfeiture status display
- clearer explanations of where dispute capital is held

### Success criteria

- dispute capital is isolated cleanly
- resolution state still lives entirely in CipherMarket
- external escrow does not break solvency or finalization flows

---

## Wave 3D: Privara LP Yield Rails

### Goal

Explore capital efficiency for LPs by routing eligible idle liquidity through external rails without compromising market solvency.

### Outcomes

- LP capital can earn yield while not actively needed
- LPs receive surplus plus yield where supported
- capital recall and payout obligations remain safe

### Why later

This is a meaningful differentiator, but it should come after public LP exists and after the protocol has mature accounting and solvency rules.

### Privara fit

Privara is a strong candidate for:

- LP idle-capital routing
- non-custodial settlement flows
- programmable payout rails

### Evaluation criteria

- how much liquidity is truly idle during market lifetime
- how quickly funds must be recallable
- what insolvency or settlement-latency risks are introduced
- whether yield meaningfully improves LP economics after fees and complexity

### Success criteria

- LP capital efficiency improves without weakening redemption guarantees
- yield routing remains optional and transparent
- accounting stays auditable

### Go / no-go gate

Wave 3D should ship only if all of the following are true:

- recall speed is sufficient for realistic redemption and settlement pressure
- insolvency risk does not materially worsen
- accounting remains auditable under external capital routing
- net LP yield is still meaningful after fees, latency, and operational complexity

If those conditions are not met, Wave 3D should be closed as non-viable and the capital-efficiency problem should be addressed through different protocol or product work in a later wave rather than remaining indefinitely in progress.

---

## Wave 4: Product Depth, Privacy UX, and Community Layer

### Goal

Make CipherMarket feel complete, alive, and durable as a product, not just as a protocol.

### Product upgrades

- stronger private portfolio UX
- smoother reveal, sell, and redeem flows
- better loading, failure, and async secure-compute states
- richer market analytics
- better market discovery and market history
- clearer docs and onboarding

### Discussions tab

Add a per-market discussions surface similar to Polymarket, adapted to CipherMarket’s privacy-oriented product design.

Target properties:

- discussions live inside each market page
- users can post under privacy-preserving pseudonymous identities or session-linked anonymous handles
- no requirement to expose public wallet identity directly in the discussion UI
- moderation and abuse controls are still available

Open design questions:

- whether posting should require wallet authentication
- whether identities are market-scoped pseudonyms or account-scoped aliases
- how to moderate spam and abuse while preserving privacy expectations

Before Wave 4 build begins, these questions should be resolved in a short product and trust-safety design note with a named owner. The discussion layer is sensitive enough that it should not enter implementation with identity, moderation, and abuse policy still undecided.

### Graphs and charts

Add stronger visual market context so the product feels more complete and analytically useful.

Potential surfaces:

- probability history chart
- liquidity depth chart
- cumulative volume chart
- oracle participation / quorum chart
- dispute activity chart
- private portfolio performance chart after reveal

Design goal:

- charts should clarify decision-making, not just decorate the UI
- the aesthetic should remain crisp, financial, and restrained

### Success criteria

- markets feel active and interpretable
- community discussion adds useful context without undermining privacy posture
- charts improve comprehension and perceived product maturity

---

## Cross-Cutting Security and Quality Work

These should continue throughout every wave.

### Contract quality

- more invariant testing
- fuzz testing for FPMM math
- tighter rounding guarantees
- better event and accounting consistency
- clearer NatSpec and protocol documentation

### Data and indexing

- add indexed historical data infrastructure for oracle votes, LP activity, dispute activity, and market history
- support quorum progress, charts, and historical analytics from an indexer rather than raw RPC calls
- define the canonical analytics/event data model early enough to support Wave 3A and beyond

### Parallel validation

- begin Privara validation during Wave 3A rather than waiting for Wave 3C
- verify whether external escrow conditions can safely depend on finalized market state
- verify whether external escrow references can be stored and resolved cleanly per dispute
- evaluate failure modes if external settlement is unavailable or delayed

### Frontend quality

- faster route transitions
- more explicit async secure-compute states
- better error reporting
- more resilient wallet / decrypt state handling
- fewer stale or misleading success states

### Product quality

- better market creation validation
- clearer oracle onboarding
- clearer dispute economics
- better admin and protocol operations surfaces

---

## Suggested Sequence

Recommended implementation order:

1. Wave 3A: Oracle committee and resolution upgrade
2. Wave 3B: Public LP
3. Wave 3C: Privara dispute bond escrow
4. Wave 3D: Privara LP yield rails
5. Wave 4: Product depth, discussions, charts, and polish

This order keeps the protocol’s decision-making and capital model solid before adding optional external settlement enhancements and broader product surfaces.

---

## Notes

- Public LP belongs before LP yield routing, because the base LP model must be correct first.
- Privara is best treated as a complementary settlement and escrow layer, not as the core prediction-market engine.
- Privara integration is conditional pending validation; it is a planned exploration path, not an unconditional protocol dependency.
- Anonymous market discussions should be designed carefully so they preserve user trust without becoming a spam surface.
- Charts and analytics should be introduced as part of real market legibility, not just for decoration.
