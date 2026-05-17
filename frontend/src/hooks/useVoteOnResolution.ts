'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';

export interface VoteOnResolutionReceipt {
  txHash: string;
}

export interface UseVoteOnResolutionResult {
  data: VoteOnResolutionReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  voteOnResolution: (marketId: number, outcomeIndex: number) => Promise<void>;
}

export default function useVoteOnResolution(): UseVoteOnResolutionResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<VoteOnResolutionReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const voteOnResolution = async (marketId: number, outcomeIndex: number): Promise<void> => {
    try {
      const predictionMarketAddress = getContractAddresses(chainId)?.predictionMarket;

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
        functionName: 'voteOnResolution',
        args: [BigInt(marketId), outcomeIndex],
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      toast.success('Oracle vote submitted.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to submit this oracle vote.');

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
    voteOnResolution,
  };
}
