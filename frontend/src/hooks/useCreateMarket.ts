'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  ERC20_ABI,
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
      const minimumTrade = parseUnits(draft.minimumTrade || '0', collateral.decimals);
      const seedLiquidity = parseUnits(draft.seedLiquidity || '0', collateral.decimals);

      if (minimumTrade <= 0n) {
        throw new Error('Minimum trade must be greater than zero.');
      }

      if (seedLiquidity <= 0n) {
        throw new Error('Seed liquidity must be greater than zero.');
      }

      if (seedLiquidity % BigInt(draft.outcomes.length) !== 0n) {
        throw new Error('Seed liquidity must split evenly across all outcomes.');
      }

      setError(null);
      setIsLoading(true);

      if (draft.collateralToken !== zeroAddress) {
        const approvalHash = await writeContractAsync({
          address: draft.collateralToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [predictionMarketAddress, seedLiquidity],
        });

        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      const marketType: MarketType = draft.marketType;
      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createMarket',
        args: [
          draft.title,
          draft.description,
          draft.category,
          draft.oracleSource,
          marketType === 'BINARY' ? 0 : 1,
          draft.outcomes,
          BigInt(Math.floor(new Date(draft.expiryTime).getTime() / 1000)),
          draft.collateralToken || zeroAddress,
          minimumTrade,
          seedLiquidity,
        ],
        value: draft.collateralToken === zeroAddress ? seedLiquidity : 0n,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setData({ txHash: hash });
      toast.success('Market created with seeded liquidity.');
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
