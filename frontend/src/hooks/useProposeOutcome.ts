'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';

export interface ProposeOutcomeReceipt {
  txHash: string;
}

export interface UseProposeOutcomeResult {
  data: ProposeOutcomeReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  proposeOutcome: (marketId: number, outcomeIndex: number) => Promise<void>;
}

/**
 * Submits an optimistic oracle proposal for a market inside the singleton contract.
 * @returns Mutation state and the proposal action.
 */
export default function useProposeOutcome(): UseProposeOutcomeResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<ProposeOutcomeReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const proposeOutcome = async (marketId: number, outcomeIndex: number): Promise<void> => {
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
        functionName: 'proposeOutcome',
        args: [BigInt(marketId), outcomeIndex],
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setData({ txHash: hash });
      toast.success('Outcome proposal submitted.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to propose an outcome.');

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
    proposeOutcome,
  };
}
