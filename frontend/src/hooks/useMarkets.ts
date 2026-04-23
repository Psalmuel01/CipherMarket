'use client';

import { useDeferredValue, useMemo } from 'react';
import { useChainId, useReadContract, useReadContracts } from 'wagmi';
import {
  getCollateralMetadata,
  getContractAddresses,
  MARKET_STATE_LABELS,
  MARKET_TYPE_LABELS,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import useAppStore from '@/store/useAppStore';
import type { MarketLifecycle, MarketOutcome, MarketSummary } from '@/types/market';
import type { Address } from 'viem';

interface PredictionMarketView {
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

export interface UseMarketsResult {
  data: MarketSummary[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  availableStatuses: Array<MarketLifecycle | 'ALL'>;
}

function mapMarketOutcomes(
  labels: string[],
  probabilities: bigint[],
  reserves: bigint[],
): MarketOutcome[] {
  return labels.map((label, outcomeIndex) => {
    const probability = probabilities[outcomeIndex] ?? 0n;
    const reserve = reserves[outcomeIndex] ?? 0n;

    return {
      id: String(outcomeIndex),
      label,
      impliedShare: Number(probability / 10_000_000_000_000_000n),
      outcomeIndex,
      probability,
      reserve,
      price: probability,
      revealedShares: null,
    };
  });
}

function mapMarketSummary(
  view: PredictionMarketView,
  probabilities: bigint[],
  reserves: bigint[],
  chainId?: number,
): MarketSummary {
  const collateral = getCollateralMetadata(view.collateralToken, chainId);

  return {
    marketId: Number(view.marketId),
    title: view.title,
    description: view.description,
    category: view.category,
    oracleSource: view.oracleSource,
    type: MARKET_TYPE_LABELS[view.marketType] ?? 'BINARY',
    totalLiquidity: view.totalCollateralCollected,
    totalCollateralCollected: view.totalCollateralCollected,
    outcomeCount: Number(view.outcomeCount),
    expiryTime: new Date(Number(view.expiryTime) * 1000).toISOString(),
    status: MARKET_STATE_LABELS[view.state] ?? 'ACTIVE',
    outcomes: mapMarketOutcomes(view.outcomes, probabilities, reserves),
    minimumTrade: view.minimumTrade,
    collateralToken: view.collateralToken,
    collateralSymbol: collateral.symbol,
  };
}

export default function useMarkets(): UseMarketsResult {
  const chainId = useChainId();
  const activeStatusFilter = useAppStore((state) => state.activeStatusFilter);
  const deferredFilter = useDeferredValue(activeStatusFilter);
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket ?? undefined;

  const nextMarketIdQuery = useReadContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'nextMarketId',
    query: {
      enabled: Boolean(predictionMarketAddress),
    },
  });

  const marketIds = useMemo(() => {
    const count = Number(nextMarketIdQuery.data ?? 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index)).reverse();
  }, [nextMarketIdQuery.data]);

  const marketReads = useReadContracts({
    contracts: predictionMarketAddress
      ? marketIds.flatMap((marketId) => [
          {
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getMarket',
            args: [marketId],
          },
          {
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getMarketProbabilities',
            args: [marketId],
          },
          {
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getOutcomeReserves',
            args: [marketId],
          },
        ])
      : [],
    query: {
      enabled: Boolean(predictionMarketAddress) && marketIds.length > 0,
    },
  });

  const data = useMemo(() => {
    const items = marketReads.data ?? [];
    const mappedMarkets: MarketSummary[] = [];

    for (let index = 0; index < items.length; index += 3) {
      const marketResult = items[index];
      const probabilityResult = items[index + 1];
      const reserveResult = items[index + 2];

      if (
        marketResult?.status !== 'success' ||
        probabilityResult?.status !== 'success' ||
        reserveResult?.status !== 'success' ||
        !marketResult.result ||
        !probabilityResult.result ||
        !reserveResult.result
      ) {
        continue;
      }

      mappedMarkets.push(
        mapMarketSummary(
          marketResult.result as unknown as PredictionMarketView,
          probabilityResult.result as bigint[],
          reserveResult.result as bigint[],
          chainId,
        ),
      );
    }

    return deferredFilter === 'ALL'
      ? mappedMarkets
      : mappedMarkets.filter((market) => market.status === deferredFilter);
  }, [chainId, deferredFilter, marketReads.data]);

  const error =
    !predictionMarketAddress
      ? new Error('PredictionMarket is not configured for the current chain.')
      : nextMarketIdQuery.error || marketReads.error || null;

  return {
    data: error ? [] : data,
    isLoading: nextMarketIdQuery.isLoading || marketReads.isLoading,
    isError: Boolean(error),
    error,
    availableStatuses: ['ALL', 'ACTIVE', 'EXPIRED', 'RESOLUTION_OPEN', 'ESCALATED', 'FINALIZED'],
  };
}
