'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';

export interface SettleEscrowReceipt {
  txHash: string;
}

export interface UseSettleEscrowResult {
  data: SettleEscrowReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  settleEscrow: (marketId: number) => Promise<void>;
}

export default function useSettleEscrow(): UseSettleEscrowResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const refreshProtocolData = useProtocolRefresh();
  const [data, setData] = useState<SettleEscrowReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const settleEscrow = async (marketId: number): Promise<void> => {
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
        functionName: 'settleEscrowDispute',
        args: [BigInt(marketId)],
        ...gasFees,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      await refreshProtocolData();
      toast.success('Dispute escrow settled successfully!');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to settle this escrow.');

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
    settleEscrow,
  };
}
