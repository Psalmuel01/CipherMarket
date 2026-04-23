'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';

export interface AddLiquidityReceipt {
  txHash: string;
}

export interface UseAddLiquidityResult {
  data: AddLiquidityReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  addLiquidity: (
    marketId: number,
    amount: string,
    decimals: number,
    isNative: boolean,
  ) => Promise<void>;
}

export default function useAddLiquidity(): UseAddLiquidityResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<AddLiquidityReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLiquidity = async (
    marketId: number,
    amount: string,
    decimals: number,
    isNative: boolean,
  ): Promise<void> => {
    try {
      const predictionMarketAddress = getContractAddresses(chainId)?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const collateralAmount = parseUnits(amount || '0', decimals);
      if (collateralAmount <= 0n) {
        throw new Error('Enter a liquidity amount greater than zero.');
      }

      setData(null);
      setError(null);
      setIsLoading(true);

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'addLiquidity',
        args: [BigInt(marketId), collateralAmount],
        value: isNative ? collateralAmount : 0n,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      toast.success('Liquidity added.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to add liquidity.');

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
    addLiquidity,
  };
}
