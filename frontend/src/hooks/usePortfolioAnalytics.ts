'use client';

import { useMemo } from 'react';
import type { MarketSummary } from '@/types/market';
import type { RevealedPortfolioPosition } from '@/hooks/usePrivatePortfolio';

export interface PortfolioAnalytics {
  totalPositions: number;
  estimatedTotalValue: number;
  estimatedValueFormatted: string;
  marketsParticipated: number;
  activePositions: number;
  finalizedPositions: number;
  redeemableCount: number;
  allocationItems: AllocationItem[];
}

export interface AllocationItem {
  marketId: number;
  marketTitle: string;
  category: string;
  outcomeLabel: string;
  shares: bigint;
  estimatedValue: number;
}

/**
 * Computes portfolio analytics from revealed positions and market data.
 */
export default function usePortfolioAnalytics(
  positions: RevealedPortfolioPosition[],
  markets: MarketSummary[],
  isRevealed: boolean,
): PortfolioAnalytics {
  return useMemo(() => {
    if (!isRevealed || positions.length === 0) {
      return {
        totalPositions: 0,
        estimatedTotalValue: 0,
        estimatedValueFormatted: '0.00',
        marketsParticipated: markets.length,
        activePositions: 0,
        finalizedPositions: 0,
        redeemableCount: 0,
        allocationItems: [],
      };
    }

    const allocationItems: AllocationItem[] = [];
    let totalValue = 0;
    let activeCount = 0;
    let finalizedCount = 0;
    let redeemableCount = 0;
    const uniqueMarkets = new Set<number>();

    for (const position of positions) {
      const market = markets.find((m) => m.marketId === position.marketId);
      if (!market) continue;

      const outcome = market.outcomes.find(
        (o) => o.outcomeIndex === position.outcomeIndex,
      );
      if (!outcome) continue;

      uniqueMarkets.add(market.marketId);

      // Determine collateral decimals
      const decimals = market.collateralSymbol === 'USDC' ? 6 : 18;
      const sharesFloat = Number(position.shares) / 10 ** decimals;
      const probability = outcome.impliedShare / 100;
      const estimated = sharesFloat * probability;
      totalValue += estimated;

      allocationItems.push({
        marketId: market.marketId,
        marketTitle: market.title,
        category: market.category,
        outcomeLabel: outcome.label,
        shares: position.shares,
        estimatedValue: estimated,
      });

      if (market.status === 'ACTIVE') activeCount++;
      if (market.status === 'FINALIZED') {
        finalizedCount++;
        // Check if this position is on the winning outcome
        // (We don't have finalOutcomeIndex on MarketSummary, so count all finalized positions)
        redeemableCount++;
      }
    }

    return {
      totalPositions: positions.length,
      estimatedTotalValue: totalValue,
      estimatedValueFormatted: totalValue < 0.01
        ? totalValue.toFixed(6)
        : totalValue.toFixed(4),
      marketsParticipated: uniqueMarkets.size,
      activePositions: activeCount,
      finalizedPositions: finalizedCount,
      redeemableCount,
      allocationItems,
    };
  }, [positions, markets, isRevealed]);
}
