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
  outcomeCount: number;
  expiryTime: string;
  status: MarketLifecycle;
  outcomes: MarketOutcome[];
  minimumTrade: bigint;
  collateralToken: Address;
  collateralSymbol: string;
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
  myLpShares: bigint;
  totalLpShares: bigint;
  estimatedLpCollateralOut: bigint;
  revealedWinningShares: bigint | null;
  canRevealPositions: boolean;
}

export interface TradeDraft {
  marketId: number;
  marketTitle: string;
  outcomeId: string;
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
  minimumStakeFormatted: string;
  proposalLocks: number;
}
