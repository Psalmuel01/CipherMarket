'use client';

import { useMemo } from 'react';
import { parseUnits } from 'viem';
import { useQuery } from '@tanstack/react-query';
import useCipherMarketClient from '@/hooks/useCipherMarketClient';
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
  const cipherMarket = useCipherMarketClient();

  const parsedAmount = useMemo(() => {
    try {
      return amount ? parseUnits(amount, decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  const query = useQuery({
    queryKey: ['market-quote', marketId, outcomeIndex, side, parsedAmount.toString()],
    enabled: Boolean(cipherMarket) && parsedAmount > 0n,
    queryFn: async () => {
      if (!cipherMarket) {
        throw new Error('CipherMarket client is not available.');
      }

      return side === 'BUY'
        ? cipherMarket.quotes.buy({ marketId, outcomeIndex, amount: parsedAmount })
        : cipherMarket.quotes.sell({ marketId, outcomeIndex, amount: parsedAmount });
    },
  });

  const data = useMemo(() => {
    if (!query.data || parsedAmount <= 0n) {
      return null;
    }

    return query.data satisfies QuotePreview;
  }, [parsedAmount, query.data]);

  return {
    data,
    isLoading: query.isLoading,
    isError: Boolean(query.error),
    error: query.error as Error | null,
  };
}
