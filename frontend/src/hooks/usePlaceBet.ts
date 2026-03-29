'use client';

import { useState } from 'react';
import { useCofheEncrypt } from '@cofhe/react';
import { Encryptable } from '@cofhe/sdk';
import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  formatContractError,
  getContractAddresses,
  MOCK_USDC_ABI,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import type { BetDraft } from '@/types/market';

export interface PlaceBetState {
  step: 'idle' | 'encrypting' | 'awaiting_wallet' | 'success';
  txHash: string | null;
}

export interface UsePlaceBetResult {
  data: PlaceBetState | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  placeBet: (draft: BetDraft) => Promise<void>;
  reset: () => void;
}

/**
 * Encrypts stake input and submits a real singleton-market bet transaction.
 * @returns Mutation state and the contract-backed placeBet action.
 */
export default function usePlaceBet(): UsePlaceBetResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { encryptInputsAsync } = useCofheEncrypt();
  const [data, setData] = useState<PlaceBetState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const placeBet = async (draft: BetDraft): Promise<void> => {
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const stakeAmount = parseUnits(draft.amount || '0', draft.collateralDecimals);
      if (stakeAmount <= 0n) {
        throw new Error('Enter a valid stake amount.');
      }

      setError(null);
      setIsLoading(true);
      setData({ step: 'encrypting', txHash: null });

      const [encryptedStake] = await encryptInputsAsync([Encryptable.uint128(stakeAmount)]);

      if (draft.collateralToken.toLowerCase() !== zeroAddress) {
        setData({ step: 'awaiting_wallet', txHash: null });

        const approvalHash = await writeContractAsync({
          address: draft.collateralToken,
          abi: MOCK_USDC_ABI,
          functionName: 'approve',
          args: [predictionMarketAddress, stakeAmount],
        });

        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      setData({ step: 'awaiting_wallet', txHash: null });

      const betHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [
          BigInt(draft.marketId),
          Number.parseInt(draft.outcomeId, 10),
          stakeAmount,
          encryptedStake,
        ],
        value: draft.collateralToken.toLowerCase() === zeroAddress ? stakeAmount : 0n,
      });

      await publicClient.waitForTransactionReceipt({ hash: betHash });

      setData({
        step: 'success',
        txHash: betHash,
      });
      toast.success(`Bet placed privately on ${draft.marketTitle}.`);
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to place bet.');

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
    placeBet,
    reset,
  };
}
