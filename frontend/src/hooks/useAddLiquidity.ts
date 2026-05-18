'use client';

import { useState } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI, ERC20_ABI } from '@/lib/contracts';
import { getBufferedGasFees, requireBufferedContractGas } from '@/lib/gas';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';

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
    collateralToken: string,
  ) => Promise<void>;
}

export default function useAddLiquidity(): UseAddLiquidityResult {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const refreshProtocolData = useProtocolRefresh();
  const [data, setData] = useState<AddLiquidityReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLiquidity = async (
    marketId: number,
    amount: string,
    decimals: number,
    isNative: boolean,
    collateralToken: string,
  ): Promise<void> => {
    try {
      const predictionMarketAddress = getContractAddresses(chainId)?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      if (!address) {
        throw new Error('Connect your wallet before adding liquidity.');
      }

      const collateralAmount = parseUnits(amount || '0', decimals);
      if (collateralAmount <= 0n) {
        throw new Error('Enter a liquidity amount greater than zero.');
      }

      setData(null);
      setError(null);
      setIsLoading(true);

      // 1. Approval if needed
      if (!isNative && collateralToken) {
        toast.info('Approving token allowance...');
        const approvalGasFees = await getBufferedGasFees(publicClient);
        const approvalHash = await writeContractAsync({
          address: collateralToken as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [predictionMarketAddress, collateralAmount],
          ...approvalGasFees,
        });

        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
        toast.success('Allowance approved.');
      }
      const gasFees = await getBufferedGasFees(publicClient);
      const gas = await requireBufferedContractGas(publicClient, {
        account: address,
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'addLiquidity',
        args: [BigInt(marketId), collateralAmount],
        value: isNative ? collateralAmount : 0n,
      });

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'addLiquidity',
        args: [BigInt(marketId), collateralAmount],
        value: isNative ? collateralAmount : 0n,
        gas,
        ...gasFees,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('The add-liquidity transaction reverted before completion.');
      }

      setData({ txHash: hash });
      await refreshProtocolData();
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
