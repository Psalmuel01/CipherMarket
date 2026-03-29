import type { Address } from 'viem';

export type MarketLifecycle =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'PROPOSED'
  | 'DISPUTED'
  | 'FINALIZED'
  | 'CANCELLED';

export type MarketType = 'BINARY' | 'CATEGORICAL';

export interface MarketOutcome {
  id: string;
  label: string;
  impliedShare: number;
  outcomeIndex: number;
}

export interface PoolSnapshot {
  outcomeId: string;
  label: string;
  liquidity: bigint;
  percentage: number;
  collateralSymbol: string;
}

export interface MarketSummary {
  marketId: number;
  title: string;
  category: string;
  type: MarketType;
  totalLiquidity: bigint;
  outcomeCount: number;
  expiryTime: string;
  status: MarketLifecycle;
  outcomes: MarketOutcome[];
  minimumStake: bigint;
  collateralToken: Address;
  collateralSymbol: string;
}

export interface MarketDetail extends MarketSummary {
  createdAt: string;
  disputeWindowEndsAt: string | null;
  creator: Address;
  proposedBy: Address | null;
  proposedOutcomeIndex: number | null;
  finalOutcomeIndex: number | null;
  pools: PoolSnapshot[];
  claimableAmount: bigint;
}

export interface BetDraft {
  marketId: number;
  marketTitle: string;
  outcomeId: string;
  amount: string;
  collateralToken: Address;
  collateralSymbol: string;
  collateralDecimals: number;
}

export interface CreateMarketDraft {
  title: string;
  category: string;
  marketType: MarketType;
  outcomes: string[];
  expiryTime: string;
  collateralToken: Address;
  minimumStake: string;
}

export interface OracleProfile {
  isRegistered: boolean;
  stakeAmount: bigint;
  stakeFormatted: string;
  disputeExposure: string;
  activeAssignments: number;
  minimumStakeFormatted: string;
}
