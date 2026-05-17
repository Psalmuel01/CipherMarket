'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';

export interface FinalizeMarketReceipt {
  txHash: string;
}

export interface UseFinalizeMarketResult {
  data: FinalizeMarketReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  finalizeMarket: (marketId: number) => Promise<void>;
}

export default function useFinalizeMarket(): UseFinalizeMarketResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<FinalizeMarketReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const finalizeMarket = async (marketId: number): Promise<void> => {
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
        functionName: 'finalizeByQuorum',
        args: [BigInt(marketId)],
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      toast.success('Market finalized by oracle quorum.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to finalize this market by quorum.');

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
