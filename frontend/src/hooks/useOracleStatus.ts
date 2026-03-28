'use client';

import type { OracleProfile } from '@/types/market';

export interface UseOracleStatusResult {
  data: OracleProfile | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Returns phase-1 placeholder oracle profile data for the dashboard shell.
 * @returns Oracle profile data plus loading and error state helpers.
 */
export default function useOracleStatus(): UseOracleStatusResult {
  return {
    data: {
      isRegistered: false,
      stakeFormatted: '0.00 tFHE',
      disputeExposure: '0 unresolved',
      activeAssignments: 3,
    },
    isLoading: false,
    isError: false,
    error: null,
  };
}

