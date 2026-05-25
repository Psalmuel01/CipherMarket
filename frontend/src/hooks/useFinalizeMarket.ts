'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';

export interface FinalizeMarketReceipt {
  txHash: string;
}

export interface UseFinalizeMarketResult {
  data: FinalizeMarketReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  finalizeMarket: (marketId: number, mode?: 'undisputed' | 'quorum') => Promise<void>;
}

export default function useFinalizeMarket(): UseFinalizeMarketResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const refreshProtocolData = useProtocolRefresh();
  const [data, setData] = useState<FinalizeMarketReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const finalizeMarket = async (
    marketId: number,
    mode: 'undisputed' | 'quorum' = 'quorum',
  ): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      setError(null);
      setIsLoading(true);
      const gasFees = await getBufferedGasFees(publicClient);

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: mode === 'undisputed' ? 'finalizeUndisputed' : 'finalizeByQuorum',
        args: [BigInt(marketId)],
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      await refreshProtocolData();
      toast.success(
        mode === 'undisputed'
          ? 'Undisputed market finalized.'
          : 'Market finalized by oracle quorum.',
      );
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to finalize this market.');

      setError(nextError);
      toast.error(nextError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
    finalizeMarket,
  };
}
