'use client';

import { motion } from 'framer-motion';
import { Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { formatTokenAmount } from '@/lib/formatters';
import type { MarketSummary } from '@/types/market';
import type { RevealedPortfolioPosition } from '@/hooks/usePrivatePortfolio';

export interface RedeemableSectionProps {
  markets: MarketSummary[];
  positions: RevealedPortfolioPosition[];
  isRevealed: boolean;
  isLoading: boolean;
}

export default function RedeemableSection({
  markets,
  positions,
  isRevealed,
  isLoading,
}: RedeemableSectionProps): JSX.Element | null {
  // Filter for markets that are finalized and where the user has a position
  const redeemableMarkets = markets.filter((market) => {
    if (market.status !== 'FINALIZED') return false;
    return positions.some((p) => p.marketId === market.marketId && p.shares > 0n);
  });

  if (redeemableMarkets.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
          <Trophy className="h-5 w-5 text-emerald-500" />
        </div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
          Redeemable Winnings
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {redeemableMarkets.map((market) => {
          const userPositionsInMarket = positions.filter((p) => p.marketId === market.marketId);
          const totalShares = userPositionsInMarket.reduce((sum, p) => sum + p.shares, 0n);
          const decimals = market.collateralSymbol === 'USDC' ? 6 : 18;

          return (
            <motion.div
              key={market.marketId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card glass-card--success rounded-[24px] p-6 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-400">
                    Finalized
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold text-[#e8e4df] line-clamp-2">
                  {market.title}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-400/60 mb-1">
                    Your winning shares
                  </p>
                  <p className="font-mono text-lg text-emerald-400">
                    {isRevealed
                      ? formatTokenAmount(totalShares, decimals, 'shares')
                      : '••••'}
                  </p>
                </div>

                <Link href={`/markets/${market.marketId}`} className="block">
                  <Button variant="primary" size="sm" className="w-full gap-2 bg-emerald-600 border-emerald-500/50 hover:bg-emerald-500">
                    Redeem Winnings <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
