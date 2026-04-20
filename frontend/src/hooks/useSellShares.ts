'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import type { TradeDraft } from '@/types/market';

export interface SellSharesState {
  step: 'idle' | 'encrypting' | 'awaiting_wallet' | 'success';
  txHash: string | null;
}

export interface UseSellSharesResult {
  data: SellSharesState | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  sellShares: (draft: TradeDraft) => Promise<void>;
  reset: () => void;
}

export default function useSellShares(): UseSellSharesResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<SellSharesState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sellShares = async (draft: TradeDraft): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const sharesIn = parseUnits(draft.amount || '0', draft.collateralDecimals);
      if (sharesIn <= 0n) {
        throw new Error('Enter a valid share amount.');
      }

      setError(null);
      setIsLoading(true);
      setData({ step: 'encrypting', txHash: null });

      setData({ step: 'awaiting_wallet', txHash: null });

      const requestHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'requestSellPositionDecrypt',
        args: [BigInt(draft.marketId), Number.parseInt(draft.outcomeId, 10)],
      });

      await publicClient.waitForTransactionReceipt({ hash: requestHash });
      await new Promise((resolve) => window.setTimeout(resolve, 12_000));

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sellShares',
        args: [
          BigInt(draft.marketId),
          Number.parseInt(draft.outcomeId, 10),
          sharesIn,
          draft.minAmountOut ?? 0n,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setData({ step: 'success', txHash: hash });
      toast.success(`Shares sold from ${draft.marketTitle}.`);
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to sell shares.');

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
    sellShares,
    reset,
  };
}
