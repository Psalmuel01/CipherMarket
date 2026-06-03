import type { Address } from 'viem';

export type MarketLifecycle =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'RESOLUTION_OPEN'
  | 'ESCALATED'
  | 'FINALIZED'
  | 'CANCELLED';

export type MarketType = 'BINARY' | 'CATEGORICAL';

export interface MarketOutcome {
  id: string;
  label: string;
  impliedShare: number;
  outcomeIndex: number;
  probability: bigint;
  reserve: bigint;
  price: bigint;
  encryptedHandle?: bigint;
  investedAmount: bigint;
  revealedShares: bigint | null;
}

export interface PoolSnapshot {
  outcomeId: string;
  label: string;
  reserve: bigint;
  percentage: number;
  collateralSymbol: string;
}

export interface QuotePreview {
  outcomeIndex: number;
  side: 'BUY' | 'SELL';
  collateralAmount: bigint;
  sharesAmount: bigint;
  feeAmount: bigint;
  averagePrice: bigint;
  slippageBps: number;
  postTradeProbabilities: bigint[];
}

export interface MarketSummary {
  marketId: number;
  title: string;
  description: string;
  category: string;
  oracleSource: string;
  type: MarketType;
  totalLiquidity: bigint;
  totalCollateralCollected: bigint;
  tradeVolume: bigint;
  outcomeCount: number;
  expiryTime: string;
  status: MarketLifecycle;
  outcomes: MarketOutcome[];
  minimumTrade: bigint;
  collateralToken: Address;
  collateralSymbol: string;
  proposedBy: Address | null;
  disputeOpenedBy: Address | null;
  proposedOutcomeIndex: number | null;
  disputeCounterOutcomeIndex: number | null;
  finalOutcomeIndex: number | null;
  disputeOpened: boolean;
  disputeRefundsEnabled: boolean;
  committeeResolved: boolean;
  committeeRewardPool: bigint;
  disputeStakeTotal: bigint;
  marketDisputeAdapter?: Address | null;
  reineiraEscrowId?: bigint | null;
  reineiraEscrowSettled?: boolean;
  reineiraNeedsActivation?: boolean;
  reineiraNeedsSettlement?: boolean;
}

export interface MarketDetail extends MarketSummary {
  createdAt: string;
  resolutionWindowEndsAt: string | null;
  escalationDeadline: string | null;
  creator: Address;
  proposedBy: Address | null;
  disputeOpenedBy: Address | null;
  proposedOutcomeIndex: number | null;
  disputeCounterOutcomeIndex: number | null;
  leadingOutcomeIndex: number | null;
  finalOutcomeIndex: number | null;
  voteWeights: bigint[];
  myVoteOutcomeIndex: number | null;
  myVoteWeightSnapshot: bigint;
  hasVotedOnResolution: boolean;
  reserves: bigint[];
  probabilities: bigint[];
  pools: PoolSnapshot[];
  tradeFeeBps: number;
  protocolFeeShareBps: number;
  seedLiquidity: bigint;
  reservePerOutcome: bigint;
  disputeStakeTotal: bigint;
  remainingWinningShares: bigint;
  resolutionQuorumStake: bigint;
  committeeRewardPool: bigint;
  totalOracleVoteWeight: bigint;
  accruedProtocolFees: bigint;
  accruedLpFees: bigint;
  protocolDisputeFees: bigint;
  disputeRefundsEnabled: boolean;
  disputeOpened: boolean;
  committeeResolved: boolean;
  hasRedeemed: boolean;
  myLpShares: bigint;
  totalLpShares: bigint;
  estimatedLpCollateralOut: bigint;
  estimatedFinalLpPayout: bigint;
  revealedWinningShares: bigint | null;
  canRevealPositions: boolean;
  marketDisputeAdapter?: Address | null;
  reineiraEscrowId?: bigint | null;
  reineiraEscrowSettled?: boolean;
  reineiraNeedsActivation?: boolean;
  reineiraNeedsSettlement?: boolean;
}

export interface TradeDraft {
  marketId: number;
  marketTitle: string;
  outcomeId: string;
  outcomeLabel: string;
  amount: string;
  collateralToken: Address;
  collateralSymbol: string;
  collateralDecimals: number;
  minAmountOut?: bigint;
}

export interface CreateMarketDraft {
  title: string;
  description: string;
  category: string;
  oracleSource: string;
  marketType: MarketType;
  outcomes: string[];
  expiryTime: string;
  collateralToken: Address;
  minimumTrade: string;
  seedLiquidity: string;
}

export interface OracleProfile {
  isRegistered: boolean;
  stakeAmount: bigint;
  stakeFormatted: string;
  disputeExposure: string;
  activeAssignments: number;
  minimumStakeAmount: bigint;
  minimumStakeFormatted: string;
  proposalLocks: number;
}
