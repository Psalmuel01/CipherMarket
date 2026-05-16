'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import LifecycleBadge from '@/components/markets/LifecycleBadge';
import Button from '@/components/ui/Button';
import { formatTokenAmount } from '@/lib/formatters';
import type { MarketLifecycle } from '@/types/market';

export interface PositionRowProps {
  marketId: number;
  marketTitle: string;
  category: string;
  outcomeLabel: string;
  outcomeIndex: number;
  shares: bigint;
  currentProbability: number;
  marketStatus: MarketLifecycle;
  collateralDecimals: number;
  collateralSymbol: string;
  isRevealed: boolean;
  /** Whether this is the first row in a market group */
  isGroupHead: boolean;
  index: number;
}

export default function PositionRow({
  marketId,
  marketTitle,
  category,
  outcomeLabel,
  shares,
  currentProbability,
  marketStatus,
  collateralDecimals,
  collateralSymbol,
  isRevealed,
  isGroupHead,
  index,
}: PositionRowProps): JSX.Element {
  // Estimate current value: shares × probability (simplified)
  const estimatedValue = isRevealed
    ? Number(shares) / 10 ** collateralDecimals * (currentProbability / 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="grid grid-cols-1 gap-3 px-6 lg:px-8 py-4 transition-colors hover:bg-white/[0.015] md:grid-cols-[2.5fr,1fr,1fr,0.8fr,0.8fr,auto] md:items-center md:gap-4 border-b border-white/[0.04] last:border-b-0"
    >
      {/* Market */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
            #{marketId}
          </span>
          {isGroupHead && (
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/15">
              {category}
            </span>
          )}
        </div>
        {isGroupHead ? (
          <h3 className="text-[14px] font-semibold text-[#e8e4df] leading-snug line-clamp-1">
            {marketTitle}
          </h3>
        ) : (
          <p className="text-[12px] text-white/20 italic">same market</p>
        )}
      </div>

      {/* Outcome */}
      <div>
        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Outcome</p>
        <p className="text-sm text-foreground font-medium">{outcomeLabel}</p>
        <p className="text-[10px] font-mono text-white/20">{currentProbability}%</p>
      </div>

      {/* Shares */}
      <div>
        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Shares</p>
        <div className={clsx(!isRevealed && 'privacy-blur')}>
          <p className="font-mono text-sm text-foreground">
            {isRevealed
              ? formatTokenAmount(shares, collateralDecimals, 'shares')
              : '████████'}
          </p>
        </div>
      </div>

      {/* Est. Value */}
      <div>
        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Est. Value</p>
        <div className={clsx(!isRevealed && 'privacy-blur')}>
          <p className="font-mono text-sm text-foreground">
            {estimatedValue !== null
              ? `${estimatedValue.toFixed(4)} ${collateralSymbol}`
              : '••••'}
          </p>
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Status</p>
        <LifecycleBadge status={marketStatus} />
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <Link href={`/markets/${marketId}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            View <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
