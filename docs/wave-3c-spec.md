# Wave 3C Spec: Privara Dispute Bond Escrow

Wave 3C is defined by the roadmap in [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md). This spec narrows that roadmap into a validation-first integration plan for moving dispute bond custody out of the core market contract and into an external escrow rail, while keeping CipherMarket as the canonical market-state engine.

## Goal

Move dispute bond custody out of `PredictionMarket` and into Privara-backed escrow when the integration assumptions are proven on Sepolia.

CipherMarket remains the on-chain source of truth for:

- market lifecycle state
- committee outcome
- escalation outcome
- whether the dispute succeeded or failed

Privara becomes a conditional settlement rail for:

- dispute bond custody
- refund release
- forfeiture routing

## Why This Wave Exists

Today, dispute bond accounting sits inside the same contract that manages:

- market collateral
- share trading
- winner redemption
- LP settlement

That works, but it increases accounting complexity and expands the blast radius of any bug in the core market contract.

Wave 3C separates those concerns:

- market logic stays in CipherMarket
- dispute bond custody moves into a dedicated escrow path

## Core Design Principle

Privara does not decide who wins a market.

CipherMarket decides:

- whether a dispute is valid
- what the final outcome is
- whether the dispute bond should be refunded or forfeited

Privara only reacts to that result by releasing or routing funds.

## Scope

Wave 3C covers:

- dispute bond escrow architecture
- Sepolia validation of Privara condition expressiveness
- optional escrow-backed dispute flow
- UI and indexing support for escrow status

Wave 3C does not cover:

- oracle voting logic
- quorum thresholds
- committee math
- LP capital routing or yield

Those remain in Wave 3A and Wave 3D.

## Locked Decisions

- CipherMarket remains the canonical protocol state machine.
- Privara integration is conditional until Sepolia validation passes.
- There must be a fallback path if Privara escrow is unavailable or validation fails.
- Dispute bonds are the only custody target in Wave 3C.
- LP capital and trader collateral stay outside Privara in this wave.
- The frontend must show escrow status clearly; users should always know whether their bond is pending, active, refunded, or forfeited.

## Validation Questions

Wave 3C should not begin full implementation until these are answered on Sepolia:

1. Can Privara programmable conditions depend on a finalized CipherMarket state in a way we can trust operationally?
2. Can the condition inspect enough state to distinguish:
   - dispute succeeded
   - dispute failed
   - market not finalized yet
3. Can the escrow release path be executed without manual operator intervention in the normal case?
4. Can the integration tolerate temporary Privara unavailability without leaving CipherMarket in an inconsistent state?

## Go / No-Go Gate

Wave 3C proceeds only if all of the following are true:

- dispute refund vs forfeiture can be expressed against finalized CipherMarket state
- escrow release can complete reliably on Sepolia
- the UX is not materially worse than the current native dispute flow
- the fallback path is clearly defined and testable

If these conditions are not met, the protocol keeps native dispute custody and Wave 3C is closed as non-viable in its current form.

## Proposed Architecture

### On-chain source of truth

CipherMarket remains responsible for:

- storing dispute intent
- storing dispute opener and counter-outcome
- tracking resolution outcome
- exposing whether the dispute bond should be refunded or forfeited

### External escrow layer

Privara holds the actual dispute bond while the market resolves.

The escrow references:

- market id
- disputing address
- collateral type
- amount
- release condition
- refund / forfeit destination rule

### Settlement split

There are two possible final outcomes for the bond:

- dispute succeeds:
  - bond returns to the disputer
- dispute fails:
  - bond is routed according to CipherMarket’s reward policy

## Dispute Bond Routing Policy

Wave 3C should preserve the Wave 3A economic model rather than invent a new one:

- successful dispute -> disputer refunded
- failed dispute -> dispute bond split:
  - `80%` to the winning oracle side
  - `20%` to protocol

That means the escrow integration must either:

- route funds directly into the final destinations, or
- release into a controlled settlement address that then distributes according to CipherMarket accounting

The second option is simpler for a first integration.

## Recommended Settlement Model

Use a controlled settlement release rather than direct fan-out from the escrow.

Flow:

1. user opens dispute
2. bond is funded into Privara escrow
3. CipherMarket stores escrow reference metadata
4. market resolves on CipherMarket
5. escrow releases based on final state:
   - success -> refund to disputer
   - failure -> release to protocol-controlled settlement receiver
6. settlement receiver distributes:
   - winning oracle reward pool
   - protocol share

This keeps the first integration simpler and avoids pushing complex reward fan-out into the escrow condition layer.

## Data Model Changes

Wave 3C likely adds:

- `disputeEscrowEnabled` flag per market or per deployment mode
- `disputeEscrowId` / `disputeReference` per market dispute
- `disputeEscrowStatus` mirror state for frontend reads
- optional `disputeSettlementPending` marker when escrow has not yet released

Important:

- CipherMarket should not store external-escrow state as authoritative truth for market resolution
- escrow state is integration metadata, not core protocol truth

## Contract Surface Changes

Expected additions or modifications:

- `openDispute(...)`
  - may switch from direct bond transfer into contract custody
  - to escrow-reference registration after successful Privara funding
- `getDisputeEscrowStatus(marketId)`
  - optional convenience view
- settlement hook or owner/operator settlement entry point
  - only if the escrow release path needs an explicit finalization acknowledgement onchain

Expected removals or reductions:

- direct long-term custody assumptions around `disputeStakeTotal`
- direct raw payout assumptions from contract-held dispute collateral

## Frontend Changes

### Dispute flow

The dispute UX becomes:

1. select counter-outcome
2. enter bond amount
3. create/fund escrow
4. confirm escrow active
5. submit dispute intent against the market

The order matters: the UI should not tell the user the dispute is live unless the escrow funding step succeeded.

### Market UI

Each disputed market should surface:

- whether the dispute bond is active
- who posted the bond
- escrow status:
  - pending
  - active
  - refunded
  - forfeited
  - settlement pending

### Failure handling

The UI must handle:

- escrow created but dispute registration failed
- dispute registration succeeded but escrow status lookup is delayed
- escrow release pending after finalization

## Fallback Path

If Privara escrow is unavailable:

- either disable escrow-backed disputes for that environment
- or fall back to native in-contract dispute custody

The fallback must be explicit, not implicit.

The frontend should show which mode is active:

- `Native dispute bond custody`
- or `External dispute escrow`

## Indexing Requirements

Wave 3C requires indexed tracking for:

- dispute opened
- escrow reference created
- escrow status updates
- refund / forfeit completion

This should build on the indexing work already called out in [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md).

## Test Plan

### Validation tests

- confirm Privara can express refund vs forfeiture against finalized CipherMarket state
- confirm Sepolia escrow creation succeeds for the market collateral used in disputes
- confirm release path completes without manual intervention in the normal case

### Contract / integration tests

- dispute flow succeeds when escrow reference exists
- dispute flow fails cleanly when escrow creation fails
- successful dispute returns bond to disputer
- failed dispute routes funds into the same economic split as Wave 3A
- fallback mode continues to work when escrow integration is disabled

### Frontend tests

- dispute panel shows escrow status transitions
- users do not see a dispute as active unless escrow funding succeeded
- failed or pending escrow states are clearly visible
- finalized markets show whether dispute settlement is complete or still pending

## Recommended First Milestone

Wave 3C should start with a small validation milestone, not a full protocol refactor.

Milestone 1:

- produce a Sepolia validation script or prototype
- confirm Privara condition expressiveness
- confirm dispute escrow funding flow
- write down pass/fail results

Only after that should the team commit to:

- contract integration changes
- frontend escrow-first dispute UX
- settlement routing implementation
