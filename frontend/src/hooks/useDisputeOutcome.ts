'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';

export interface DisputeOutcomeReceipt {
  txHash: string;
}

export interface UseDisputeOutcomeResult {
  data: DisputeOutcomeReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  disputeOutcome: (marketId: number, amount: string, decimals: number, isNative: boolean) => Promise<void>;
}

export default function useDisputeOutcome(): UseDisputeOutcomeResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<DisputeOutcomeReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const disputeOutcome = async (
    marketId: number,
    amount: string,
    decimals: number,
    isNative: boolean,
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

      const stakeAmount = parseUnits(amount || '0', decimals);
      if (stakeAmount <= 0n) {
        throw new Error('Enter a dispute stake greater than zero.');
      }

      setError(null);
      setIsLoading(true);

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'disputeOutcome',
        args: [BigInt(marketId), stakeAmount],
        value: isNative ? stakeAmount : 0n,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      toast.success('Dispute submitted.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to dispute this outcome.');

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
    disputeOutcome,
  };
}
