'use client';

import { useDeferredValue } from 'react';
import useAppStore from '@/store/useAppStore';
import type { MarketLifecycle, MarketSummary } from '@/types/market';

const SAMPLE_MARKETS: MarketSummary[] = [
  {
    address: '0x5f2d3d4f7f6b4c44f87c7250c6fe2f2606570a11',
    title: 'Will ETH settle above $4,000 by June 30?',
    category: 'Macro',
    type: 'BINARY',
    totalLiquidity: 1_280_000n,
    outcomeCount: 2,
    expiryTime: '2026-06-30T16:00:00.000Z',
    status: 'ACTIVE',
    outcomes: [
      { id: 'yes', label: 'YES', impliedShare: 58 },
      { id: 'no', label: 'NO', impliedShare: 42 },
    ],
  },
  {
    address: '0x31cb1f683b703a4ea093fa2e2692fa5d3a54d2bc',
    title: 'Which L2 leads stablecoin volume this quarter?',
    category: 'Infra',
    type: 'CATEGORICAL',
    totalLiquidity: 845_000n,
    outcomeCount: 4,
    expiryTime: '2026-05-12T13:00:00.000Z',
    status: 'PROPOSED',
    outcomes: [
      { id: 'base', label: 'BASE', impliedShare: 37 },
      { id: 'arb', label: 'ARB', impliedShare: 33 },
      { id: 'op', label: 'OP', impliedShare: 18 },
      { id: 'other', label: 'OTHER', impliedShare: 12 },
    ],
  },
  {
    address: '0x91b6f6a90d0d65f7a3cd830bc94b0cc0175651fa',
    title: 'Will the first FHE-native consumer app hit 100k MAU?',
    category: 'FHE',
    type: 'BINARY',
    totalLiquidity: 420_000n,
    outcomeCount: 2,
    expiryTime: '2026-04-07T09:00:00.000Z',
    status: 'EXPIRED',
    outcomes: [
      { id: 'yes', label: 'YES', impliedShare: 49 },
      { id: 'no', label: 'NO', impliedShare: 51 },
    ],
  },
];

export interface UseMarketsResult {
  data: MarketSummary[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  availableStatuses: Array<MarketLifecycle | 'ALL'>;
}

/**
 * Provides market list data for the phase-1 shell with status filtering baked in.
 * @returns Market data plus loading and error state helpers.
 */
export default function useMarkets(): UseMarketsResult {
  const activeStatusFilter = useAppStore((state) => state.activeStatusFilter);
  const deferredFilter = useDeferredValue(activeStatusFilter);

  const data =
    deferredFilter === 'ALL'
      ? SAMPLE_MARKETS
      : SAMPLE_MARKETS.filter((market) => market.status === deferredFilter);

  return {
    data,
    isLoading: false,
    isError: false,
    error: null,
    availableStatuses: ['ALL', 'ACTIVE', 'PROPOSED', 'EXPIRED', 'FINALIZED'],
  };
}

