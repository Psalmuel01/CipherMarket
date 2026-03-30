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
  createdAt: bigint;
  expiryTime: bigint;
  disputeWindowEndsAt: bigint;
  minimumStake: bigint;
  totalLiquidity: bigint;
  disputeStakeTotal: bigint;
  outcomeCount: number;
  proposedOutcome: number;
  finalOutcome: number;
  marketType: number;
  state: number;
  title: string;
  category: string;
  outcomes: string[];
}

export interface UseMarketsResult {
  data: MarketSummary[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  availableStatuses: Array<MarketLifecycle | 'ALL'>;
}

function mapOutcomeLabels(labels: string[]): MarketOutcome[] {
  const total = labels.length || 1;

  return labels.map((label, outcomeIndex) => ({
    id: String(outcomeIndex),
    label,
    impliedShare: Math.max(Math.round(100 / total), 1),
    outcomeIndex,
  }));
}

function mapMarketSummary(view: PredictionMarketView, chainId?: number): MarketSummary {
  const collateral = getCollateralMetadata(view.collateralToken, chainId);

  return {
    marketId: Number(view.marketId),
    title: view.title,
    category: view.category,
    type: MARKET_TYPE_LABELS[view.marketType] ?? 'BINARY',
    totalLiquidity: view.totalLiquidity,
    outcomeCount: Number(view.outcomeCount),
    expiryTime: new Date(Number(view.expiryTime) * 1000).toISOString(),
    status: MARKET_STATE_LABELS[view.state] ?? 'ACTIVE',
    outcomes: mapOutcomeLabels(view.outcomes),
    minimumStake: view.minimumStake,
    collateralToken: view.collateralToken,
    collateralSymbol: collateral.symbol,
  };
}

/**
 * Reads the singleton market registry and exposes the list view used throughout the app shell.
 * @returns Market list state, loading, and error helpers.
 */
export default function useMarkets(): UseMarketsResult {
  const chainId = useChainId();
  const activeStatusFilter = useAppStore((state) => state.activeStatusFilter);
  const deferredFilter = useDeferredValue(activeStatusFilter);
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket ?? undefined;
  const isLocalMarketConfigured = Boolean(predictionMarketAddress);

  const nextMarketIdQuery = useReadContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'nextMarketId',
    query: {
      enabled: isLocalMarketConfigured,
    },
  });

  const marketIds = useMemo(() => {
    if (!isLocalMarketConfigured || nextMarketIdQuery.error) {
      return [];
    }

    const count = Number(nextMarketIdQuery.data ?? 0n);
    return Array.from({ length: count }, (_, index) => BigInt(index)).reverse();
  }, [isLocalMarketConfigured, nextMarketIdQuery.data, nextMarketIdQuery.error]);

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
      enabled: Boolean(predictionMarketAddress) && marketIds.length > 0,
    },
  });

  const data = useMemo(() => {
    const items = marketReads.data ?? [];

    const mappedMarkets = items
      .map((item) => {
        if (item.status !== 'success' || !item.result) {
          return null;
        }

        return mapMarketSummary(item.result as unknown as PredictionMarketView, chainId);
      })
      .filter((market): market is MarketSummary => market !== null);

    return deferredFilter === 'ALL'
      ? mappedMarkets
      : mappedMarkets.filter((market) => market.status === deferredFilter);
  }, [chainId, deferredFilter, marketReads.data]);

  const hasReadError = Boolean(nextMarketIdQuery.error || marketReads.error);

  return {
    data: hasReadError ? [] : data,
    isLoading: nextMarketIdQuery.isLoading || marketReads.isLoading,
    isError: false,
    error: null,
    availableStatuses: ['ALL', 'ACTIVE', 'EXPIRED', 'PROPOSED', 'DISPUTED', 'FINALIZED'],
  };
}
