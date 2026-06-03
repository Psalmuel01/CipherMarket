'use client';

import { useQuery } from '@tanstack/react-query';
import { useChainId } from 'wagmi';
import useCipherMarketClient from '@/hooks/useCipherMarketClient';
import { LIVE_PUBLIC_QUERY_OPTIONS } from '@/lib/queryOptions';

export default function useReineiraDisputeStatus(marketId: number | null, enabled = true) {
  const chainId = useChainId();
  const cipherMarket = useCipherMarketClient();

  return useQuery({
    queryKey: ['reineira-dispute-status', chainId, marketId],
    enabled: enabled && marketId !== null && Boolean(cipherMarket),
    queryFn: async () => {
      if (!cipherMarket || marketId === null) {
        throw new Error('CipherMarket client is not available.');
      }

      return cipherMarket.disputes.getReineiraStatus(marketId);
    },
    ...LIVE_PUBLIC_QUERY_OPTIONS,
  });
}
