'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  formatContractError,
  getCollateralMetadata,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import type { CreateMarketDraft, MarketType } from '@/types/market';

export interface CreateMarketReceipt {
  txHash: string;
}

export interface UseCreateMarketResult {
  data: CreateMarketReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  createMarket: (draft: CreateMarketDraft) => Promise<void>;
}

/**
 * Creates a new singleton-managed market on-chain.
 * @returns Mutation state and the createMarket action.
 */
export default function useCreateMarket(): UseCreateMarketResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<CreateMarketReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const createMarket = async (draft: CreateMarketDraft): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const collateral = getCollateralMetadata(draft.collateralToken, chainId);
      const minimumStake = parseUnits(draft.minimumStake || '0', collateral.decimals);
      if (minimumStake <= 0n) {
        throw new Error('Minimum stake must be greater than zero.');
      }

      setError(null);
      setIsLoading(true);

      const marketType: MarketType = draft.marketType;
      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createMarket',
        args: [
          draft.title,
          draft.category,
          marketType === 'BINARY' ? 0 : 1,
          draft.outcomes,
          BigInt(Math.floor(new Date(draft.expiryTime).getTime() / 1000)),
          draft.collateralToken || zeroAddress,
          minimumStake,
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setData({ txHash: hash });
      toast.success('Market created on-chain.');
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to create market.');

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
    createMarket,
  };
}
