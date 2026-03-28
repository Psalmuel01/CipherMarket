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
}

export interface PoolSnapshot {
  outcomeId: string;
  label: string;
  liquidity: bigint;
  percentage: number;
}

export interface MarketSummary {
  address: `0x${string}`;
  title: string;
  category: string;
  type: MarketType;
  totalLiquidity: bigint;
  outcomeCount: number;
  expiryTime: string;
  status: MarketLifecycle;
  outcomes: MarketOutcome[];
}

export interface BetDraft {
  marketAddress: `0x${string}`;
  outcomeId: string;
  amount: string;
}

export interface OracleProfile {
  isRegistered: boolean;
  stakeFormatted: string;
  disputeExposure: string;
  activeAssignments: number;
}

