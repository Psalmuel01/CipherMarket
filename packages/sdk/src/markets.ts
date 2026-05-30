import type { Address, PublicClient } from 'viem';
import { PREDICTION_MARKET_ABI } from './abi';
import { getCollateralMetadata, MARKET_STATE_LABELS, MARKET_TYPE_LABELS } from './addresses';
import { computeProbabilitiesFromReserves } from './marketMath';
import type {
  ChainContractAddresses,
  MarketOutcome,
  MarketSummary,
  PoolSnapshot,
  PredictionMarketView,
} from './types';

export function mapMarketOutcomes(
  labels: string[],
  probabilities: bigint[],
  reserves: bigint[],
  investedAmounts: bigint[] = [],
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
      investedAmount: investedAmounts[outcomeIndex] ?? 0n,
      revealedShares: null,
    };
  });
}

export function buildPools(outcomes: MarketOutcome[], collateralSymbol: string): PoolSnapshot[] {
  return outcomes.map((outcome) => ({
    outcomeId: outcome.id,
    label: outcome.label,
    reserve: outcome.reserve,
    percentage: outcome.impliedShare,
    collateralSymbol,
  }));
}

export function mapMarketSummary(
  view: PredictionMarketView,
  probabilities: bigint[],
  reserves: bigint[],
  addresses?: ChainContractAddresses | null,
): MarketSummary {
  const collateral = getCollateralMetadata(view.collateralToken, addresses);

  return {
    marketId: Number(view.marketId),
    title: view.title,
    description: view.description,
    category: view.category,
    oracleSource: view.oracleSource,
    type: MARKET_TYPE_LABELS[view.marketType] ?? 'BINARY',
    totalLiquidity: view.totalCollateralCollected,
    totalCollateralCollected: view.totalCollateralCollected,
    tradeVolume: view.tradeVolume,
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

export async function getPoolReserves(
  publicClient: PublicClient,
  predictionMarketAddress: Address,
  marketId: bigint,
  outcomeCount: number,
): Promise<bigint[]> {
  const reserves: bigint[] = [];
  for (let outcomeIndex = 0; outcomeIndex < outcomeCount; outcomeIndex += 1) {
    const reserve = await publicClient.readContract({
      address: predictionMarketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'poolBalances',
      args: [marketId, BigInt(outcomeIndex)],
    });
    reserves.push(typeof reserve === 'bigint' ? reserve : 0n);
  }
  return reserves;
}

export async function getMarket(
  publicClient: PublicClient,
  predictionMarketAddress: Address,
  marketId: bigint | number,
): Promise<PredictionMarketView> {
  return publicClient.readContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
  }) as Promise<PredictionMarketView>;
}

export async function listMarkets(
  publicClient: PublicClient,
  predictionMarketAddress: Address,
  addresses?: ChainContractAddresses | null,
): Promise<MarketSummary[]> {
  const nextMarketId = await publicClient.readContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'nextMarketId',
  });
  const count = Number(nextMarketId ?? 0n);
  const summaries: MarketSummary[] = [];

  for (let index = count - 1; index >= 0; index -= 1) {
    const view = await getMarket(publicClient, predictionMarketAddress, BigInt(index));
    const reserves = await getPoolReserves(
      publicClient,
      predictionMarketAddress,
      view.marketId,
      Number(view.outcomeCount),
    );
    summaries.push(mapMarketSummary(view, computeProbabilitiesFromReserves(reserves), reserves, addresses));
  }

  return summaries;
}
