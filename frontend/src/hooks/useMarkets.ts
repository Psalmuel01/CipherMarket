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
import { computeProbabilitiesFromReserves } from '@/lib/marketMath';
import { LIVE_PUBLIC_QUERY_OPTIONS } from '@/lib/queryOptions';
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
      investedAmount: 0n,
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
    proposedBy:
      view.proposedBy.toLowerCase() === '0x0000000000000000000000000000000000000000'
        ? null
        : view.proposedBy,
    disputeOpenedBy:
      view.disputeOpenedBy.toLowerCase() === '0x0000000000000000000000000000000000000000'
        ? null
        : view.disputeOpenedBy,
    proposedOutcomeIndex: view.proposedOutcome === 255 ? null : Number(view.proposedOutcome),
    disputeCounterOutcomeIndex:
      view.disputeCounterOutcome === 255 ? null : Number(view.disputeCounterOutcome),
    finalOutcomeIndex: view.finalOutcome === 255 ? null : Number(view.finalOutcome),
    disputeOpened: view.disputeOpened,
    disputeRefundsEnabled: view.disputeRefundsEnabled,
    committeeResolved: view.committeeResolved,
    committeeRewardPool: view.committeeRewardPool,
    disputeStakeTotal: view.disputeStakeTotal,
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
      ...LIVE_PUBLIC_QUERY_OPTIONS,
      enabled: Boolean(predictionMarketAddress),
    },
  });

  const marketIds = useMemo(() => {
    const count = Number(nextMarketIdQuery.data ?? 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index)).reverse();
  }, [nextMarketIdQuery.data]);

  const marketReads = useReadContracts({
    contracts: predictionMarketAddress
      ? marketIds.map((marketId) => ({
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'getMarket',
          args: [marketId],
        }))
      : [],
    query: {
      ...LIVE_PUBLIC_QUERY_OPTIONS,
      enabled: Boolean(predictionMarketAddress) && marketIds.length > 0,
    },
  });

  const marketViews = useMemo(
    () =>
      (marketReads.data ?? [])
        .filter((result): result is NonNullable<typeof result> => Boolean(result))
        .filter((result) => result.status === 'success' && Boolean(result.result))
        .map((result) => result.result as unknown as PredictionMarketView),
    [marketReads.data],
  );

  const reserveReads = useReadContracts({
    contracts: predictionMarketAddress
      ? marketViews.flatMap((view) =>
          Array.from({ length: Number(view.outcomeCount) }, (_, outcomeIndex) => ({
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'poolBalances',
            args: [view.marketId, BigInt(outcomeIndex)],
          })),
        )
      : [],
    query: {
      ...LIVE_PUBLIC_QUERY_OPTIONS,
      enabled: Boolean(predictionMarketAddress) && marketViews.length > 0,
    },
  });

  const data = useMemo(() => {
    const mappedMarkets: MarketSummary[] = [];
    const reserveItems = reserveReads.data ?? [];
    let reserveCursor = 0;

    for (const marketView of marketViews) {
      const outcomeCount = Number(marketView.outcomeCount);
      const reserves = Array.from({ length: outcomeCount }, (_, outcomeIndex) => {
        const result = reserveItems[reserveCursor + outcomeIndex];
        return result?.status === 'success' && typeof result.result === 'bigint'
          ? result.result
          : 0n;
      });
      reserveCursor += outcomeCount;
      const probabilities = computeProbabilitiesFromReserves(reserves);

      mappedMarkets.push(
        mapMarketSummary(
          marketView,
          probabilities,
          reserves,
          chainId,
        ),
      );
    }

    return deferredFilter === 'ALL'
      ? mappedMarkets
      : mappedMarkets.filter((market) => market.status === deferredFilter);
  }, [chainId, deferredFilter, marketViews, reserveReads.data]);

  const error =
    !predictionMarketAddress
      ? new Error('PredictionMarket is not configured for the current chain.')
      : nextMarketIdQuery.error || marketReads.error || reserveReads.error || null;

  return {
    data: error ? [] : data,
    isLoading: nextMarketIdQuery.isLoading || marketReads.isLoading || reserveReads.isLoading,
    isError: Boolean(error),
    error,
    availableStatuses: ['ALL', 'ACTIVE', 'EXPIRED', 'RESOLUTION_OPEN', 'ESCALATED', 'FINALIZED'],
  };
}
