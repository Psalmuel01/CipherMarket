import type { Address, PublicClient } from 'viem';
import { PREDICTION_MARKET_ABI } from './abi.js';
import type { QuotePreview } from './types.js';

export function normalizeQuoteResult(
  result: readonly [bigint, bigint, bigint, readonly bigint[]],
  params: {
    side: 'BUY' | 'SELL';
    outcomeIndex: number;
    amount: bigint;
  },
): QuotePreview {
  const postTradeProbabilities = [...result[3]];
  const collateralAmount = params.side === 'BUY' ? params.amount : result[0];
  const sharesAmount = params.side === 'BUY' ? result[0] : params.amount;
  const averagePrice = result[2];
  const referencePrice =
    params.side === 'BUY'
      ? (postTradeProbabilities[params.outcomeIndex] ?? 0n)
      : (postTradeProbabilities[params.outcomeIndex] ?? averagePrice);
  const slippageBps =
    referencePrice > 0n
      ? Number(
          ((averagePrice > referencePrice ? averagePrice - referencePrice : referencePrice - averagePrice) *
            10_000n) / referencePrice,
        )
      : 0;

  return {
    outcomeIndex: params.outcomeIndex,
    side: params.side,
    collateralAmount,
    sharesAmount,
    feeAmount: result[1],
    averagePrice,
    slippageBps,
    postTradeProbabilities,
  };
}

export async function quoteTrade(
  publicClient: PublicClient,
  predictionMarketAddress: Address,
  params: {
    side: 'BUY' | 'SELL';
    marketId: number | bigint;
    outcomeIndex: number;
    amount: bigint;
  },
): Promise<QuotePreview> {
  const result = await publicClient.readContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: params.side === 'BUY' ? 'quoteBuy' : 'quoteSell',
    args: [BigInt(params.marketId), params.outcomeIndex, params.amount],
  });

  return normalizeQuoteResult(result as [bigint, bigint, bigint, bigint[]], params);
}
