'use client';

import { useState } from 'react';

export interface ClaimRewardReceipt {
  txHash: string;
  amount: string;
}

export interface UseClaimRewardResult {
  data: ClaimRewardReceipt | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  claimReward: () => Promise<void>;
}

/**
 * Simulates the permit-gated claim flow for the phase-1 shell.
 * @returns Claim state and an action for triggering the mock claim.
 */
export default function useClaimReward(): UseClaimRewardResult {
  const [data, setData] = useState<ClaimRewardReceipt | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const claimReward = async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setData({
        txHash: '0xclaim9f44a7e9c312',
        amount: '184.20 tFHE',
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError : new Error('Unable to claim reward.'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
    claimReward,
  };
}

