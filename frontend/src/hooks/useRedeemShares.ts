'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';

export interface RedeemSharesReceipt {
  txHash: string;
  amount: string;
}

export interface UseRedeemSharesResult {
  data: RedeemSharesReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  redeemShares: (marketId: number, amount: bigint, symbol: string, decimals: number) => Promise<void>;
}

export default function useRedeemShares(): UseRedeemSharesResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<RedeemSharesReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const redeemShares = async (
    marketId: number,
    amount: bigint,
    symbol: string,
    decimals: number,
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

      const requestHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'requestRedeemPositionDecrypt',
        args: [BigInt(marketId)],
      });

      await publicClient.waitForTransactionReceipt({ hash: requestHash });
      await new Promise((resolve) => window.setTimeout(resolve, 12_000));

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'redeemShares',
        args: [BigInt(marketId)],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      const formattedAmount = `${formatUnits(amount, decimals)} ${symbol}`;
      setData({
        txHash: hash,
        amount: formattedAmount,
      });
      toast.success(`Redeemed ${formattedAmount}.`);
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to redeem shares.');

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
    redeemShares,
  };
}
