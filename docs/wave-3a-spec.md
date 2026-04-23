# CipherMarket Wave 3A Spec

Reference roadmap: [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md)

## Purpose

This document kicks off Wave 3A from the roadmap and turns its open questions into implementation-grade decisions.

Wave 3A goal:

- replace the single-proposer plus admin-fallback resolution flow with a multi-oracle committee model
- make disputes explicit counter-outcome challenges
- align proposer, voter, and disputer incentives
- keep admin as a fallback only when quorum fails or the market cannot resolve through the committee path

---

## Locked Decisions

### 1. Voting visibility model

Wave 3A will use **open voting**, not commit-reveal voting.

Reasoning:

- it is easier to implement and test cleanly in the current singleton architecture
- it keeps quorum progress and vote distribution legible in the frontend
- it avoids adding a second reveal phase and timeout path to already complex market resolution state
- it is sufficient for V2 committee resolution, while commit-reveal can remain a later upgrade if collusion concerns justify the added complexity

Implication:

- oracle votes are visible on-chain
- vote weights are visible through indexed data and public reads
- the UI can show live quorum progress and current leading outcome

### 2. Quorum failure policy

Wave 3A will use the following fallback policy:

- if quorum is reached and one outcome has strictly highest weighted stake, that outcome wins
- if quorum is not reached by the end of the voting window, the market escalates to `ESCALATED`
- if the vote is tied at the top by weighted stake, the market escalates to `ESCALATED`
- if votes are fragmented and quorum is reached but no single highest-weight winner exists because of a tie, the market escalates to `ESCALATED`
- only in `ESCALATED` does admin fallback resolution become available

Reasoning:

- this avoids hidden heuristics in tie/no-quorum cases
- it preserves the principle that admin is fallback only
- it creates a crisp, indexable state transition for the frontend and operations surface

### 3. Wrong dispute economics

Wave 3A will treat a dispute as wrong when the final winning outcome matches the original proposal.

In that case:

- the disputer loses their dispute stake
- the forfeited stake is split:
  - `80%` to the winning oracle side, pro rata by stake-weighted participation
  - `20%` to protocol treasury

Reasoning:

- winning oracle participants should be rewarded for correct participation
- protocol receives a small cut for operating the resolution system
- the disputer should face real downside for low-quality challenges

### 4. Successful dispute economics

Wave 3A will treat a dispute as successful when the final winning outcome differs from the original proposal.

In that case:

- the disputer can reclaim their dispute stake
- the original proposer becomes slash-eligible
- slash amount is governed by protocol rules, not arbitrary admin preference in the committee-resolved path

### 5. Proposer slash policy

Wave 3A proposer slashing is rule-bound:

- if the proposer’s proposed outcome loses after quorum-backed resolution, proposer slash applies
- default slash target for Wave 3A:
  - `20%` of proposer stake, capped by available oracle stake
- proposer slash proceeds go to protocol treasury in Wave 3A
- admin can only override slash in `ESCALATED` fallback resolution paths, not in normal committee resolution

Reasoning:

- a losing proposer should face meaningful, predictable accountability
- slash policy should not remain discretionary for ordinary committee-resolved markets
- routing slash to protocol is the simplest and cleanest accounting path for this wave

### 6. Voter penalties

Wave 3A does **not** slash ordinary oracle voters for landing on the losing side.

Reasoning:

- voters should be encouraged to participate
- losing voters already lose opportunity cost and reward upside
- proposer carries higher accountability than passive voters

### 7. Vote weight snapshot implementation

Wave 3A will snapshot oracle vote weight **at vote time**, not at proposal time.

Implementation rule:

- when an oracle calls `voteOnResolution(...)`, `PredictionMarket` reads the oracle's current stake from `OracleRegistry`
- that value is stored in `oracleVoteWeightSnapshot[marketId][oracle]`
- reward distribution later uses the stored snapshot, not the oracle's live current stake

Reasoning:

- this is simpler than global proposal-time stake snapshotting
- it avoids introducing registry-wide snapshot machinery into Wave 3A
- it prevents reward gaming by increasing stake after voting but before claiming

---

## State Machine Changes

Current states in V1:

- `ACTIVE`
- `EXPIRED`
- `PROPOSED`
- `DISPUTED`
- `FINALIZED`

Wave 3A target states:

- `ACTIVE`
- `EXPIRED`
- `RESOLUTION_OPEN`
- `ESCALATED`
- `FINALIZED`

State meanings:

- `ACTIVE`: trading open
- `EXPIRED`: trading closed, no oracle proposal yet
- `RESOLUTION_OPEN`: proposal submitted, committee voting window active
- `ESCALATED`: committee could not resolve by quorum rules, admin fallback available
- `FINALIZED`: outcome locked, redemptions open

Notes:

- `PROPOSED` and `DISPUTED` collapse into a single committee-driven `RESOLUTION_OPEN`
- explicit dispute intent still exists, but it becomes part of the voting/challenge data model rather than a separate terminal state
- `ESCALATED` should include an explicit escalation timeout in implementation so markets cannot remain unresolved indefinitely

---

## Contract Design

### PredictionMarket changes

`PredictionMarket.sol` remains the market source of truth.

New or changed storage per market:

- `resolutionWindowEndsAt`
- `resolutionQuorumStake`
- `proposedOutcome`
- `proposedBy`
- `leadingOutcome`
- `winningOutcome`
- `disputeOpened`
- `disputeCounterOutcome`
- `disputeOpenedBy`
- `disputeStakeAmount`
- `proposalResolvedByCommittee`

New aggregate vote storage:

- `oracleVoteWeight[marketId][outcomeIndex]`
- `oracleHasVoted[marketId][oracle]`
- `oracleVoteChoice[marketId][oracle]`
- `oracleVoteWeightSnapshot[marketId][oracle]`
- `oracleRewardClaimed[marketId][oracle]`

Implementation rule:

- `oracleVoteWeight[marketId][outcomeIndex]` is maintained incrementally
- it must be updated atomically inside every successful `voteOnResolution(...)` call
- it must **not** be computed lazily at finalization time by iterating voters

New dispute storage:

- `marketDispute[marketId]` or equivalent struct with:
  - counter-outcome
  - disputer
  - dispute stake
  - dispute success flag

New constants / configurable parameters:

- `defaultResolutionWindow`
- `defaultQuorumStake`
- `defaultProposerSlashBps`
- `defaultEscalationTimeout`
- `winningOracleRewardShareBps = 8000`
- `protocolDisputeShareBps = 2000`

### OracleRegistry changes

Oracle stake remains ETH-backed for Wave 3A.

Potential additions:

- `getOracleStake(address oracle)` convenience view
- optional stake snapshot helper if we want deterministic vote weighting by proposal-time stake rather than current stake

Important design choice:

Wave 3A should snapshot oracle vote weight at vote time, not read mutable current stake later during reward distribution.

The registry itself does not need global proposal-time snapshots in Wave 3A.

---

## Function Surface

### New or updated functions on PredictionMarket

#### Proposal and resolution lifecycle

- `proposeOutcome(uint256 marketId, uint8 outcomeIndex)`
- `openDispute(uint256 marketId, uint8 counterOutcomeIndex, uint128 stakeAmount)`
- `voteOnResolution(uint256 marketId, uint8 outcomeIndex)`
- `finalizeByQuorum(uint256 marketId)`
- `escalateIfUnresolved(uint256 marketId)`
- `resolveEscalated(uint256 marketId, uint8 finalOutcome)` onlyOwner

#### Claims and rewards

- `claimDisputeRefund(uint256 marketId)`
- `claimOracleResolutionReward(uint256 marketId)`
- `claimProtocolFees(uint256 marketId)`

#### Views

- `getMarketResolution(uint256 marketId)`
- `getOutcomeVoteWeight(uint256 marketId)`
- `getOracleVote(uint256 marketId, address oracle)`
- `getResolutionWindowStatus(uint256 marketId)`

### Deprecated / replaced V1 functions

- `disputeOutcome(...)` becomes `openDispute(...)` with explicit `counterOutcomeIndex`
- `finalizeMarket(...)` becomes committee-path `finalizeByQuorum(...)`
- `resolveDispute(...)` becomes fallback-only `resolveEscalated(...)`

---

## Resolution Flow

### Standard path

1. Market expires.
2. A registered oracle proposes outcome `A`.
3. Market enters `RESOLUTION_OPEN`.
4. Other registered oracles vote for any valid outcome.
5. A disputer may open a challenge with explicit counter-outcome `B` and stake.
6. At window end:
   - if quorum is reached and one outcome has strictly highest vote weight, finalize to that outcome
   - if proposer outcome wins:
     - disputer loses stake
     - oracle side earns rewards
     - no proposer slash
   - if different outcome wins:
     - disputer reclaims stake
     - proposer slash applies
     - winning oracle side may still receive reward from protocol-defined sources

### Escalation path

1. Resolution window closes.
2. No quorum or top-outcome tie exists.
3. Market enters `ESCALATED`.
4. Only admin can finalize via `resolveEscalated(...)`.

### Action ordering rules

- voting and disputing are independent actions
- the same address may both vote and open a dispute if it satisfies both role requirements
- dispute stake is separate from oracle vote weight
- opening a dispute does **not** count as a vote for the counter-outcome
- voting does **not** automatically open a dispute

### Proposer participation rule

Wave 3A allows the original proposer to vote separately.

Important clarification:

- the proposal itself is **not** counted as a vote
- if the proposer wants stake-weight influence in the committee process, they must cast a normal vote like any other oracle

This avoids implicit double-counting while still allowing the proposer to participate in the committee.

### Escalation timeout

Wave 3A should include an explicit timeout once a market enters `ESCALATED`.

Target rule:

- if admin has not resolved the escalated market within `defaultEscalationTimeout`, a monitored fallback process must trigger

For Wave 3A implementation, the minimum acceptable version is:

- define and store the timeout on-chain
- document it clearly in operations/UI
- make it visible in the frontend

If a trust-minimized fallback is not implemented in the same wave, the timeout must still exist as an explicit operational SLA rather than being left undefined.

---

## Frontend Scope

Wave 3A frontend work should follow this spec and the roadmap in [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md).

Required UI updates:

- market detail:
  - proposal banner
  - explicit counter-outcome dispute form
  - oracle voting panel
  - live quorum progress
  - weighted outcome leaderboard
  - escalation state panel
- oracle desk:
  - markets awaiting vote
  - oracle’s current votes
  - vote weight snapshots
  - reward eligibility
- admin panel:
  - escalated market resolver only
  - no admin resolution for healthy quorum-resolved markets
  - escalation timeout visibility

---

## Data and Indexing Requirements

Wave 3A should not rely on raw RPC polling alone for resolution UX.

Required indexed data:

- proposals
- votes
- dispute openings
- quorum totals
- finalization mode: committee vs escalation
- oracle reward claims

This indexed layer is also where:

- quorum progress history
- resolution window state
- escalation timeout state

should be sourced for frontend display.

Recommended implementation:

- add an indexing layer in parallel with contract work
- design event payloads for easy time-series and leaderboard queries

---

## Testing Scope

Wave 3A contract tests should cover:

- proposal after expiry
- only registered oracles can propose or vote
- explicit counter-outcome disputes
- voting and disputing can be performed independently by the same address when permitted
- proposal itself does not count as a vote
- quorum success path
- no-quorum escalation
- tied-vote escalation
- wrong disputer loses stake
- successful disputer gets refund
- proposer slash on overturned proposal
- no ordinary voter slashing
- admin fallback only works in escalated markets
- votes revert after `resolutionWindowEndsAt`
- `finalizeByQuorum(...)` reverts before the resolution window closes
- oracle rewards can only be claimed after finalization
- oracle rewards are unavailable on admin-escalated outcomes unless explicitly enabled later

---

## First Implementation Milestone

The first coding milestone for Wave 3A should be:

1. refactor market state and storage for `RESOLUTION_OPEN` and `ESCALATED`
2. add proposal, dispute-with-counter-outcome, and oracle vote storage
3. add vote weight snapshotting and incremental vote-weight aggregation
4. add basic quorum finalization path
5. add escalation path
6. preserve current redemption logic after finalization
7. add reward, refund, and proposer-slash accounting paths

This gives the protocol its new resolution spine before frontend polish and reward distribution details are layered in.
