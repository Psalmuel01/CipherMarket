'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';

export interface RemoveLiquidityReceipt {
  txHash: string;
}

export interface UseRemoveLiquidityResult {
  data: RemoveLiquidityReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  removeLiquidity: (
    marketId: number,
    lpShares: string,
    minCollateralOut: bigint,
    decimals: number,
  ) => Promise<void>;
}

export default function useRemoveLiquidity(): UseRemoveLiquidityResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<RemoveLiquidityReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const removeLiquidity = async (
    marketId: number,
    lpShares: string,
    minCollateralOut: bigint,
    decimals: number,
  ): Promise<void> => {
    try {
      const predictionMarketAddress = getContractAddresses(chainId)?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const lpSharesAmount = parseUnits(lpShares || '0', decimals);
      if (lpSharesAmount <= 0n) {
        throw new Error('Enter LP shares greater than zero.');
      }

      setData(null);
      setError(null);
      setIsLoading(true);

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'removeLiquidity',
        args: [BigInt(marketId), lpSharesAmount, minCollateralOut],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setData({ txHash: hash });
      toast.success('Liquidity removed.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to remove liquidity.');

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
    removeLiquidity,
  };
}
