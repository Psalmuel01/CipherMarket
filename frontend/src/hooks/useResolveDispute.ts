'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';

export interface ResolveDisputeReceipt {
  txHash: string;
}

export interface UseResolveDisputeResult {
  data: ResolveDisputeReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  resolveDispute: (marketId: number, finalOutcome: number) => Promise<void>;
}

export default function useResolveDispute(): UseResolveDisputeResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const refreshProtocolData = useProtocolRefresh();
  const [data, setData] = useState<ResolveDisputeReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resolveDispute = async (marketId: number, finalOutcome: number): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      setData(null);
      setError(null);
      setIsLoading(true);
      const gasFees = await getBufferedGasFees(publicClient);

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'resolveEscalated',
        args: [BigInt(marketId), finalOutcome],
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      await refreshProtocolData();
      toast.success('Escalated market resolved.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to resolve this escalated market.');

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
    resolveDispute,
  };
}
