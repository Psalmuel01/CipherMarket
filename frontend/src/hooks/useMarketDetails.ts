'use client';

import { useMemo } from 'react';
import { useAccount, useChainId, useReadContract, useReadContracts } from 'wagmi';
import {
  getCollateralMetadata,
  getContractAddresses,
  MARKET_STATE_LABELS,
  MARKET_TYPE_LABELS,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import type { MarketDetail, MarketOutcome, PoolSnapshot } from '@/types/market';
import type { Address } from 'viem';

interface PredictionMarketView {
  marketId: bigint;
  creator: Address;
  collateralToken: Address;
  proposedBy: Address;
  createdAt: bigint;
  expiryTime: bigint;
  disputeWindowEndsAt: bigint;
  minimumTrade: bigint;
  seedLiquidity: bigint;
  totalCollateralCollected: bigint;
  disputeStakeTotal: bigint;
  remainingWinningShares: bigint;
  accruedProtocolFees: bigint;
  accruedLpFees: bigint;
  protocolDisputeFees: bigint;
  tradeFeeBps: number;
  protocolFeeShareBps: number;
  outcomeCount: number;
  proposedOutcome: number;
  finalOutcome: number;
  marketType: number;
  state: number;
  lpClaimed: boolean;
  protocolFeesClaimed: boolean;
  disputeRefundsEnabled: boolean;
  title: string;
  description: string;
  category: string;
  oracleSource: string;
  outcomes: string[];
}

export interface UseMarketDetailsResult {
  data: MarketDetail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

function buildOutcomes(
  labels: string[],
  probabilities: bigint[],
  reserves: bigint[],
): MarketOutcome[] {
  return labels.map((label, outcomeIndex) => {
    const probability = probabilities[outcomeIndex] ?? 0n;

    return {
      id: String(outcomeIndex),
      label,
      impliedShare: Number(probability / 10_000_000_000_000_000n),
      outcomeIndex,
      probability,
      reserve: reserves[outcomeIndex] ?? 0n,
      price: probability,
      revealedShares: null,
    };
  });
}

function buildPools(outcomes: MarketOutcome[], collateralSymbol: string): PoolSnapshot[] {
  return outcomes.map((outcome) => ({
    outcomeId: outcome.id,
    label: outcome.label,
    reserve: outcome.reserve,
    percentage: outcome.impliedShare,
    collateralSymbol,
  }));
}

export default function useMarketDetails(marketIdParam: string): UseMarketDetailsResult {
  const chainId = useChainId();
  const { address } = useAccount();
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket ?? undefined;
  const marketId = Number.parseInt(marketIdParam, 10);
  const validMarketId = Number.isInteger(marketId) && marketId >= 0 ? BigInt(marketId) : null;

  const marketQuery = useReadContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: validMarketId !== null ? [validMarketId] : undefined,
    query: {
      enabled: Boolean(predictionMarketAddress) && validMarketId !== null,
    },
  });

  const detailReads = useReadContracts({
    contracts:
      predictionMarketAddress && validMarketId !== null
        ? [
            {
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getOutcomeReserves',
              args: [validMarketId],
            },
            {
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getMarketProbabilities',
              args: [validMarketId],
            },
          ]
        : [],
    query: {
      enabled: Boolean(predictionMarketAddress) && validMarketId !== null,
    },
  });

  const data = useMemo(() => {
    const marketView = marketQuery.data as PredictionMarketView | undefined;

    if (!marketView) {
      return null;
    }

    const reserveResult = detailReads.data?.[0];
    const probabilityResult = detailReads.data?.[1];
    const reserves =
      reserveResult?.status === 'success' && reserveResult.result ? (reserveResult.result as bigint[]) : [];
    const probabilities =
      probabilityResult?.status === 'success' && probabilityResult.result
        ? (probabilityResult.result as bigint[])
        : [];

    const collateral = getCollateralMetadata(marketView.collateralToken, chainId);
    const outcomes = buildOutcomes(marketView.outcomes, probabilities, reserves);

    return {
      marketId: Number(marketView.marketId),
      title: marketView.title,
      description: marketView.description,
      category: marketView.category,
      oracleSource: marketView.oracleSource,
      type: MARKET_TYPE_LABELS[marketView.marketType] ?? 'BINARY',
      totalLiquidity: marketView.totalCollateralCollected,
      totalCollateralCollected: marketView.totalCollateralCollected,
      outcomeCount: Number(marketView.outcomeCount),
      expiryTime: new Date(Number(marketView.expiryTime) * 1000).toISOString(),
      status: MARKET_STATE_LABELS[marketView.state] ?? 'ACTIVE',
      outcomes,
      minimumTrade: marketView.minimumTrade,
      collateralToken: marketView.collateralToken,
      collateralSymbol: collateral.symbol,
      createdAt: new Date(Number(marketView.createdAt) * 1000).toISOString(),
      disputeWindowEndsAt:
        Number(marketView.disputeWindowEndsAt) > 0
          ? new Date(Number(marketView.disputeWindowEndsAt) * 1000).toISOString()
          : null,
      creator: marketView.creator,
      proposedBy:
        marketView.proposedBy.toLowerCase() === '0x0000000000000000000000000000000000000000'
          ? null
          : marketView.proposedBy,
      proposedOutcomeIndex:
        marketView.proposedOutcome === 255 ? null : Number(marketView.proposedOutcome),
      finalOutcomeIndex: marketView.finalOutcome === 255 ? null : Number(marketView.finalOutcome),
      reserves,
      probabilities,
      pools: buildPools(outcomes, collateral.symbol),
      tradeFeeBps: Number(marketView.tradeFeeBps),
      protocolFeeShareBps: Number(marketView.protocolFeeShareBps),
      seedLiquidity: marketView.seedLiquidity,
      reservePerOutcome: reserves[0] ?? 0n,
      disputeStakeTotal: marketView.disputeStakeTotal,
      remainingWinningShares: marketView.remainingWinningShares,
      accruedProtocolFees: marketView.accruedProtocolFees,
      accruedLpFees: marketView.accruedLpFees,
      protocolDisputeFees: marketView.protocolDisputeFees,
      disputeRefundsEnabled: marketView.disputeRefundsEnabled,
      revealedWinningShares: null,
      canRevealPositions: Boolean(address),
    } satisfies MarketDetail;
  }, [address, chainId, detailReads.data, marketQuery.data]);

  const error =
    validMarketId === null
      ? new Error('The market id in this route is invalid.')
      : !predictionMarketAddress
        ? new Error('PredictionMarket is not configured for the current chain.')
        : marketQuery.error || detailReads.error || null;

  return {
    data,
    isLoading: marketQuery.isLoading || detailReads.isLoading,
    isError: Boolean(error),
    error,
  };
}
