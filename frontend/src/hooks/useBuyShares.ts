'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  ERC20_ABI,
  formatContractError,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import type { TradeDraft } from '@/types/market';

export interface BuySharesState {
  step: 'idle' | 'encrypting' | 'awaiting_wallet' | 'success';
  txHash: string | null;
}

export interface UseBuySharesResult {
  data: BuySharesState | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  buyShares: (draft: TradeDraft) => Promise<void>;
  reset: () => void;
}

export default function useBuyShares(): UseBuySharesResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<BuySharesState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const buyShares = async (draft: TradeDraft): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const collateralAmount = parseUnits(draft.amount || '0', draft.collateralDecimals);
      if (collateralAmount <= 0n) {
        throw new Error('Enter a valid trade amount.');
      }

      setError(null);
      setIsLoading(true);
      setData({ step: 'encrypting', txHash: null });

      if (draft.collateralToken.toLowerCase() !== zeroAddress) {
        setData({ step: 'awaiting_wallet', txHash: null });

        const approvalHash = await writeContractAsync({
          address: draft.collateralToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [predictionMarketAddress, collateralAmount],
        });

        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      setData({ step: 'awaiting_wallet', txHash: null });

      const buyHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyShares',
        args: [
          BigInt(draft.marketId),
          Number.parseInt(draft.outcomeId, 10),
          collateralAmount,
          draft.minAmountOut ?? 0n,
        ],
        value: draft.collateralToken.toLowerCase() === zeroAddress ? collateralAmount : 0n,
      });

      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      setData({
        step: 'success',
        txHash: buyHash,
      });
      toast.success(`Shares purchased in ${draft.marketTitle}.`);
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to buy shares.');

      setError(nextError);
      toast.error(nextError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = (): void => {
    setData(null);
    setError(null);
    setIsLoading(false);
  };

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
    buyShares,
    reset,
  };
}
