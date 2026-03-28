'use client';

import { useState } from 'react';
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
 * Simulates the private bet placement flow for the phase-1 frontend shell.
 * @returns Mutation state and a placeholder bet action.
 */
export default function usePlaceBet(): UsePlaceBetResult {
  const [data, setData] = useState<PlaceBetState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const placeBet = async (draft: BetDraft): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      setData({ step: 'encrypting', txHash: null });

      await new Promise((resolve) => setTimeout(resolve, 850));
      setData({ step: 'awaiting_wallet', txHash: null });

      await new Promise((resolve) => setTimeout(resolve, 950));
      setData({
        step: 'success',
        txHash: `0xcm${draft.marketAddress.slice(4, 18)}${draft.outcomeId}`.slice(0, 24),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError : new Error('Unable to place bet.'));
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

