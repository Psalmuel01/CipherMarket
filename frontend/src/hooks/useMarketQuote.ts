'use client';

import { useMemo } from 'react';
import { parseUnits } from 'viem';
import { useChainId, useReadContract } from 'wagmi';
import { getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import type { QuotePreview } from '@/types/market';

export interface UseMarketQuoteParams {
  marketId: number;
  outcomeIndex: number;
  amount: string;
  decimals: number;
  side: 'BUY' | 'SELL';
}

export interface UseMarketQuoteResult {
  data: QuotePreview | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export default function useMarketQuote({
  amount,
  decimals,
  marketId,
  outcomeIndex,
  side,
}: UseMarketQuoteParams): UseMarketQuoteResult {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket ?? undefined;

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const query = useReadContract({
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: side === 'BUY' ? 'quoteBuy' : 'quoteSell',
    args: parsedAmount > 0n ? [BigInt(marketId), outcomeIndex, parsedAmount] : undefined,
    query: {
      enabled: Boolean(predictionMarketAddress) && parsedAmount > 0n,
    },
  });

  const data = useMemo(() => {
    if (!query.data || parsedAmount <= 0n) {
      return null;
    }

    const result = query.data as [bigint, bigint, bigint, bigint[]];
    const collateralAmount = side === 'BUY' ? parsedAmount : result[0];
    const sharesAmount = side === 'BUY' ? result[0] : parsedAmount;
    const averagePrice = result[2];
    const referencePrice =
      side === 'BUY'
        ? (result[3][outcomeIndex] ?? 0n)
        : (result[3][outcomeIndex] ?? averagePrice);
    const slippageBps =
      referencePrice > 0n
        ? Number(
            ((averagePrice > referencePrice ? averagePrice - referencePrice : referencePrice - averagePrice) *
              10_000n) / referencePrice,
          )
        : 0;

    return {
      outcomeIndex,
      side,
      collateralAmount,
      sharesAmount,
      feeAmount: result[1],
      averagePrice,
      slippageBps,
      postTradeProbabilities: result[3],
    } satisfies QuotePreview;
  }, [outcomeIndex, parsedAmount, query.data, side]);

  return {
    data,
    isLoading: query.isLoading,
    isError: Boolean(query.error),
    error: query.error as Error | null,
  };
}
