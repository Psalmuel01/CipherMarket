import type { Abi, Address, Hex, PublicClient, WalletClient } from 'viem';
import type { Permit } from '@cofhe/sdk/permits';

export type MarketLifecycle =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'RESOLUTION_OPEN'
  | 'ESCALATED'
  | 'FINALIZED'
  | 'CANCELLED';

export type MarketType = 'BINARY' | 'CATEGORICAL';

export interface ChainContractAddresses {
  oracleRegistry: Address | null;
  predictionMarket: Address | null;
  reineiraDisputeEscrowAdapter: Address | null;
  usdc: Address | null;
}

export interface CollateralMetadata {
  symbol: string;
  decimals: number;
  isNative: boolean;
}

export interface MarketOutcome {
  id: string;
  label: string;
  impliedShare: number;
  outcomeIndex: number;
  probability: bigint;
  reserve: bigint;
  price: bigint;
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

export interface PredictionMarketView {
  marketId: bigint;
  creator: Address;
  collateralToken: Address;
  proposedBy: Address;
  disputeOpenedBy: Address;
  createdAt: bigint;
  expiryTime: bigint;
  resolutionWindowEndsAt: bigint;
  escalationDeadline: bigint;
  minimumTrade: bigint;
  seedLiquidity: bigint;
  totalCollateralCollected: bigint;
  tradeVolume: bigint;
  disputeStakeTotal: bigint;
  remainingWinningShares: bigint;
  resolutionQuorumStake: bigint;
  committeeRewardPool: bigint;
  totalOracleVoteWeight: bigint;
  accruedProtocolFees: bigint;
  accruedLpFees: bigint;
  protocolDisputeFees: bigint;
  tradeFeeBps: number;
  protocolFeeShareBps: number;
  outcomeCount: number;
  proposedOutcome: number;
  disputeCounterOutcome: number;
  leadingOutcome: number;
  finalOutcome: number;
  marketType: number;
  state: number;
  lpClaimed: boolean;
  protocolFeesClaimed: boolean;
  disputeRefundsEnabled: boolean;
  disputeOpened: boolean;
  committeeResolved: boolean;
  title: string;
  description: string;
  category: string;
  oracleSource: string;
  outcomes: string[];
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
}

export interface CipherMarketClientConfig {
  chainId: number;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  cofheClient?: CofheClientLike;
  account?: Address;
  addresses: ChainContractAddresses;
  getGasFees?: () => Promise<{
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  }>;
  estimateGas?: (request: Record<string, unknown>, fallbackGas: bigint) => Promise<bigint>;
}

export interface CofheClientLike {
  connected?: boolean;
  connecting?: boolean;
  connect: (publicClient: PublicClient, walletClient: WalletClient) => Promise<void>;
  permits: {
    getActivePermit: (chainId?: number, account?: string) => Permit | undefined;
    getOrCreateSelfPermit: (
      chainId?: number,
      account?: string,
      options?: {
        issuer: string;
        name: string;
        expiration?: number;
      },
    ) => Promise<Permit>;
    removePermit: (hash: string, chainId?: number, account?: string) => void | Promise<void>;
  };
  decryptForTx: (ctHash: Hex) => {
    setAccount: (account: Address) => {
      setChainId: (chainId: number) => {
        withPermit: (permit: Permit) => {
          execute: () => Promise<{ decryptedValue: bigint | string | number; signature: Hex }>;
        };
      };
    };
  };
  decryptForView: (ctHash: Hex, fheType: unknown) => {
    setAccount: (account: Address) => {
      setChainId: (chainId: number) => {
        withPermit: (permit: Permit) => {
          execute: () => Promise<bigint | string | number>;
        };
      };
    };
  };
  encryptInputs?: (inputs: unknown[]) => {
    setAccount: (account: Address) => {
      setChainId: (chainId: number) => {
        execute: () => Promise<unknown[]>;
      };
    };
  };
}

export interface ContractArtifacts {
  predictionMarketAbi: Abi;
  oracleRegistryAbi: Abi;
  reineiraDisputeEscrowAdapterAbi: Abi;
  erc20Abi: Abi;
}
