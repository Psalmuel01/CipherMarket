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

export interface UseMarketDetailsResult {
  data: MarketDetail | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

function buildOutcomes(labels: string[], poolTotals: bigint[], totalLiquidity: bigint): MarketOutcome[] {
  return labels.map((label, outcomeIndex) => {
    const liquidity = poolTotals[outcomeIndex] ?? 0n;
    const impliedShare =
      totalLiquidity > 0n ? Number((liquidity * 100n) / totalLiquidity) : Math.round(100 / labels.length);

    return {
      id: String(outcomeIndex),
      label,
      impliedShare: Math.max(impliedShare, 1),
      outcomeIndex,
    };
  });
}

function buildPools(
  outcomes: MarketOutcome[],
  poolTotals: bigint[],
  collateralSymbol: string,
): PoolSnapshot[] {
  const totalLiquidity = poolTotals.reduce((sum, amount) => sum + amount, 0n);

  return outcomes.map((outcome) => {
    const liquidity = poolTotals[outcome.outcomeIndex] ?? 0n;

    return {
      outcomeId: outcome.id,
      label: outcome.label,
      liquidity,
      percentage: totalLiquidity > 0n ? Number((liquidity * 100n) / totalLiquidity) : outcome.impliedShare,
      collateralSymbol,
    };
  });
}

/**
 * Reads the singleton contract state needed to render a single market detail page.
 * @param marketIdParam The route segment currently representing the market id.
 * @returns Market detail data plus loading and error helpers.
 */
export default function useMarketDetails(marketIdParam: string): UseMarketDetailsResult {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket ?? undefined;
  const marketId = Number.parseInt(marketIdParam, 10);
  const validMarketId = Number.isInteger(marketId) && marketId >= 0 ? BigInt(marketId) : null;

  const marketQuery = useReadContract({
    address: predictionMarketAddress ?? undefined,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: validMarketId !== null ? [validMarketId] : undefined,
    query: {
      enabled: Boolean(predictionMarketAddress) && validMarketId !== null,
    },
  });

  const marketView = marketQuery.data as PredictionMarketView | undefined;
  const outcomeIndices = useMemo(
    () =>
      marketView
        ? Array.from({ length: Number(marketView.outcomeCount) }, (_, index) => BigInt(index))
        : [],
    [marketView],
  );

  const poolQueries = useReadContracts({
    contracts:
      predictionMarketAddress && validMarketId !== null
        ? outcomeIndices.map((outcomeIndex) => ({
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'getOutcomeLiquidity',
          args: [validMarketId, Number(outcomeIndex)],
        }))
        : [],
    query: {
      enabled:
        Boolean(predictionMarketAddress) &&
        validMarketId !== null &&
        outcomeIndices.length > 0,
    },
  });

  const claimableQuery = useReadContract({
    address: predictionMarketAddress ?? undefined,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getClaimableAmount',
    args: validMarketId !== null && address ? [validMarketId, address] : undefined,
    query: {
      enabled:
        Boolean(predictionMarketAddress) &&
        validMarketId !== null &&
        Boolean(address) &&
        isConnected,
    },
  });

  const data = useMemo(() => {
    if (!marketView) {
      return null;
    }

    const collateral = getCollateralMetadata(marketView.collateralToken, chainId);
    const poolTotals = (poolQueries.data ?? []).map((item) =>
      item.status === 'success' && item.result ? (item.result as bigint) : 0n,
    );
    const outcomes = buildOutcomes(marketView.outcomes, poolTotals, marketView.totalLiquidity);

    return {
      marketId: Number(marketView.marketId),
      title: marketView.title,
      category: marketView.category,
      type: MARKET_TYPE_LABELS[marketView.marketType] ?? 'BINARY',
      totalLiquidity: marketView.totalLiquidity,
      outcomeCount: Number(marketView.outcomeCount),
      expiryTime: new Date(Number(marketView.expiryTime) * 1000).toISOString(),
      status: MARKET_STATE_LABELS[marketView.state] ?? 'ACTIVE',
      outcomes,
      minimumStake: marketView.minimumStake,
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
      pools: buildPools(outcomes, poolTotals, collateral.symbol),
      claimableAmount: (claimableQuery.data as bigint | undefined) ?? 0n,
    } satisfies MarketDetail;
  }, [chainId, claimableQuery.data, marketView, poolQueries.data, isConnected]);

  const error =
    validMarketId === null
      ? new Error('The market id in this route is invalid.')
      : !predictionMarketAddress
        ? new Error('PredictionMarket is not configured for the current chain.')
        : marketQuery.error || poolQueries.error || claimableQuery.error || null;

  return {
    data,
    isLoading: marketQuery.isLoading || poolQueries.isLoading || claimableQuery.isLoading,
    isError: Boolean(error),
    error,
  };
}
