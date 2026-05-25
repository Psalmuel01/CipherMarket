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
import { computeProbabilitiesFromReserves } from '@/lib/marketMath';
import { LIVE_PUBLIC_QUERY_OPTIONS } from '@/lib/queryOptions';
import useMarkets from '@/hooks/useMarkets';
import type { MarketDetail, MarketOutcome, PoolSnapshot } from '@/types/market';
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
  const { data: allMarkets } = useMarkets();
  const prefetchedMarket = allMarkets?.find((m) => String(m.marketId) === marketIdParam);

  const marketQuery = useReadContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: validMarketId !== null ? [validMarketId] : undefined,
    query: {
      ...LIVE_PUBLIC_QUERY_OPTIONS,
      enabled: Boolean(predictionMarketAddress) && validMarketId !== null,
    },
  });

  const marketView = marketQuery.data as PredictionMarketView | undefined;
  const outcomeCount = marketView ? Number(marketView.outcomeCount) : 0;

  const detailReads = useReadContracts({
    contracts:
      predictionMarketAddress && validMarketId !== null && outcomeCount > 0
        ? [
            ...Array.from({ length: outcomeCount }, (_, outcomeIndex) => ({
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'poolBalances',
              args: [validMarketId, BigInt(outcomeIndex)],
            })),
            ...Array.from({ length: outcomeCount }, (_, outcomeIndex) => ({
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'oracleVoteWeight',
              args: [validMarketId, outcomeIndex],
            })),
            {
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'totalLpShares',
              args: [validMarketId],
            },
            ...(address
              ? [
                  {
                    address: predictionMarketAddress,
                    abi: PREDICTION_MARKET_ABI,
                    functionName: 'lpShares',
                    args: [validMarketId, address],
                  },
                  {
                    address: predictionMarketAddress,
                    abi: PREDICTION_MARKET_ABI,
                    functionName: 'hasRedeemed',
                    args: [validMarketId, address],
                  },
                  {
                    address: predictionMarketAddress,
                    abi: PREDICTION_MARKET_ABI,
                    functionName: 'oracleHasVoted',
                    args: [validMarketId, address],
                  },
                  {
                    address: predictionMarketAddress,
                    abi: PREDICTION_MARKET_ABI,
                    functionName: 'oracleVoteChoice',
                    args: [validMarketId, address],
                  },
                  {
                    address: predictionMarketAddress,
                    abi: PREDICTION_MARKET_ABI,
                    functionName: 'oracleVoteWeightSnapshot',
                    args: [validMarketId, address],
                  },
                ]
              : []),
          ]
        : [],
    query: {
      ...LIVE_PUBLIC_QUERY_OPTIONS,
      enabled: Boolean(predictionMarketAddress) && validMarketId !== null && outcomeCount > 0,
    },
  });

  const data = useMemo(() => {
    if (!marketView) {
      return null;
    }

    const readResults = detailReads.data ?? [];
    const reserves = Array.from({ length: outcomeCount }, (_, outcomeIndex) => {
      const result = readResults[outcomeIndex];
      return result?.status === 'success' && typeof result.result === 'bigint'
        ? result.result
        : prefetchedMarket?.outcomes[outcomeIndex]?.reserve ?? 0n;
    });
    const voteWeights = Array.from({ length: outcomeCount }, (_, outcomeIndex) => {
      const result = readResults[outcomeCount + outcomeIndex];
      return result?.status === 'success' && typeof result.result === 'bigint'
        ? result.result
        : 0n;
    });
    const totalLpSharesResult = readResults[outcomeCount * 2];
    const totalLpShares =
      totalLpSharesResult?.status === 'success' && typeof totalLpSharesResult.result === 'bigint'
        ? totalLpSharesResult.result
        : 0n;
    const myLpSharesResult = address ? readResults[outcomeCount * 2 + 1] : null;
    const myLpShares =
      myLpSharesResult?.status === 'success' && typeof myLpSharesResult.result === 'bigint'
        ? myLpSharesResult.result
        : 0n;
    const probabilities = computeProbabilitiesFromReserves(reserves);
    const accountReadOffset = outcomeCount * 2 + 1;
    const hasRedeemedResult = address ? readResults[accountReadOffset + 1] : null;
    const hasRedeemed =
      hasRedeemedResult?.status === 'success' && typeof hasRedeemedResult.result === 'boolean'
        ? hasRedeemedResult.result
        : false;
    const oracleReadOffset = outcomeCount * 2 + 1 + (address ? 2 : 0);
    const hasVotedResult = address ? readResults[oracleReadOffset] : null;
    const voteChoiceResult = address ? readResults[oracleReadOffset + 1] : null;
    const voteWeightSnapshotResult = address ? readResults[oracleReadOffset + 2] : null;
    const hasVoted =
      hasVotedResult?.status === 'success' && typeof hasVotedResult.result === 'boolean'
        ? hasVotedResult.result
        : false;
    const myVoteOutcomeIndex =
      hasVoted &&
      voteChoiceResult?.status === 'success' &&
      typeof voteChoiceResult.result === 'number' &&
      voteChoiceResult.result !== 255
        ? voteChoiceResult.result
        : null;
    const myVoteWeightSnapshot =
      voteWeightSnapshotResult?.status === 'success' &&
      typeof voteWeightSnapshotResult.result === 'bigint'
        ? voteWeightSnapshotResult.result
        : 0n;

    const collateral = getCollateralMetadata(marketView.collateralToken, chainId);
    const outcomes = buildOutcomes(marketView.outcomes, probabilities, reserves);
    const reservedProtocolFees = marketView.protocolFeesClaimed ? 0n : marketView.accruedProtocolFees;
    const finalLpPayoutBase =
      marketView.totalCollateralCollected > marketView.remainingWinningShares + reservedProtocolFees
        ? marketView.totalCollateralCollected - marketView.remainingWinningShares - reservedProtocolFees
        : 0n;

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
      resolutionWindowEndsAt:
        Number(marketView.resolutionWindowEndsAt) > 0
          ? new Date(Number(marketView.resolutionWindowEndsAt) * 1000).toISOString()
          : null,
      escalationDeadline:
        Number(marketView.escalationDeadline) > 0
          ? new Date(Number(marketView.escalationDeadline) * 1000).toISOString()
          : null,
      creator: marketView.creator,
      proposedBy:
        marketView.proposedBy.toLowerCase() === '0x0000000000000000000000000000000000000000'
          ? null
          : marketView.proposedBy,
      disputeOpenedBy:
        marketView.disputeOpenedBy.toLowerCase() === '0x0000000000000000000000000000000000000000'
          ? null
          : marketView.disputeOpenedBy,
      proposedOutcomeIndex:
        marketView.proposedOutcome === 255 ? null : Number(marketView.proposedOutcome),
      disputeCounterOutcomeIndex:
        marketView.disputeCounterOutcome === 255 ? null : Number(marketView.disputeCounterOutcome),
      leadingOutcomeIndex: marketView.leadingOutcome === 255 ? null : Number(marketView.leadingOutcome),
      finalOutcomeIndex: marketView.finalOutcome === 255 ? null : Number(marketView.finalOutcome),
      voteWeights,
      myVoteOutcomeIndex,
      myVoteWeightSnapshot,
      hasVotedOnResolution: hasVoted,
      reserves,
      probabilities,
      pools: buildPools(outcomes, collateral.symbol),
      tradeFeeBps: Number(marketView.tradeFeeBps),
      protocolFeeShareBps: Number(marketView.protocolFeeShareBps),
      seedLiquidity: marketView.seedLiquidity,
      reservePerOutcome: reserves[0] ?? 0n,
      disputeStakeTotal: marketView.disputeStakeTotal,
      remainingWinningShares: marketView.remainingWinningShares,
      resolutionQuorumStake: marketView.resolutionQuorumStake,
      committeeRewardPool: marketView.committeeRewardPool,
      totalOracleVoteWeight: marketView.totalOracleVoteWeight,
      accruedProtocolFees: marketView.accruedProtocolFees,
      accruedLpFees: marketView.accruedLpFees,
      protocolDisputeFees: marketView.protocolDisputeFees,
      disputeRefundsEnabled: marketView.disputeRefundsEnabled,
      disputeOpened: marketView.disputeOpened,
      committeeResolved: marketView.committeeResolved,
      hasRedeemed,
      myLpShares,
      totalLpShares,
      estimatedLpCollateralOut:
        totalLpShares === 0n
          ? 0n
          : (reserves.reduce((sum, reserve) => sum + reserve, 0n) * myLpShares) / totalLpShares,
      estimatedFinalLpPayout:
        totalLpShares === 0n ? 0n : (finalLpPayoutBase * myLpShares) / totalLpShares,
      revealedWinningShares: null,
      canRevealPositions: Boolean(address),
    } satisfies MarketDetail;
  }, [address, chainId, detailReads.data, marketView, outcomeCount, prefetchedMarket]);

  const error =
    validMarketId === null
      ? new Error('The market id in this route is invalid.')
      : !predictionMarketAddress
        ? new Error('PredictionMarket is not configured for the current chain.')
        : marketQuery.error || detailReads.error || null;

  return {
    data,
    isLoading: marketQuery.isLoading,
    isError: Boolean(error),
    error,
  };
}
