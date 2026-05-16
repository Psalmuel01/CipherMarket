'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface AllocationItem {
  marketId: number;
  marketTitle: string;
  category: string;
  outcomeLabel: string;
  shares: bigint;
  estimatedValue: number;
}

export interface AllocationChartProps {
  items: AllocationItem[];
  isRevealed: boolean;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: 'bg-primary',
  Politics: 'bg-blue-500',
  Sports: 'bg-emerald-500',
  Technology: 'bg-violet-500',
  Finance: 'bg-amber-500',
  Science: 'bg-cyan-500',
  Culture: 'bg-pink-500',
};

function getColor(category: string, index: number): string {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const fallbackColors = [
    'bg-primary',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-rose-500',
  ];
  return fallbackColors[index % fallbackColors.length];
}

function getTextColor(category: string, index: number): string {
  return getColor(category, index).replace('bg-', 'text-');
}

export default function AllocationChart({
  items,
  isRevealed,
  className,
}: AllocationChartProps): JSX.Element {
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + item.estimatedValue, 0),
    [items],
  );

  const segments = useMemo(() => {
    if (totalValue === 0) return [];
    return items
      .filter((item) => item.estimatedValue > 0)
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .map((item, index) => ({
        ...item,
        percentage: (item.estimatedValue / totalValue) * 100,
        color: getColor(item.category, index),
        textColor: getTextColor(item.category, index),
      }));
  }, [items, totalValue]);

  if (!isRevealed) {
    return (
      <div className={clsx('glass-card rounded-[24px] p-8', className)}>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
            Allocation
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white/[0.02] flex items-center justify-center">
              <span className="font-mono text-sm text-white/15">Sealed</span>
            </div>
          </div>
          <p className="text-xs text-white/25 text-center max-w-xs">
            Reveal your portfolio to see your position allocation across markets.
          </p>
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className={clsx('glass-card rounded-[24px] p-8', className)}>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
            Allocation
          </h3>
        </div>
        <p className="text-sm text-white/30 text-center py-8">
          No active positions to display.
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('glass-card rounded-[24px] p-8', className)}>
      <div className="flex items-center gap-3 mb-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
          Allocation
        </h3>
        <span className="font-mono text-[9px] text-white/20">
          {segments.length} position{segments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Horizontal bar chart */}
      <div className="space-y-3">
        <div className="h-3 rounded-full overflow-hidden bg-white/[0.04] flex">
          {segments.map((segment, index) => (
            <motion.div
              key={`${segment.marketId}-${segment.outcomeLabel}`}
              className={clsx('h-full', segment.color, index === 0 && 'rounded-l-full', index === segments.length - 1 && 'rounded-r-full')}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(segment.percentage, 2)}%` }}
              transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="grid gap-2 sm:grid-cols-2">
          {segments.map((segment, index) => (
            <motion.div
              key={`${segment.marketId}-${segment.outcomeLabel}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2 hover:bg-white/[0.04] transition-colors"
            >
              <div className={clsx('w-2 h-2 rounded-full shrink-0', segment.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#e8e4df] font-medium truncate">
                  {segment.outcomeLabel}
                </p>
                <p className="text-[9px] text-white/25 truncate">{segment.marketTitle}</p>
              </div>
              <span className="font-mono text-[10px] text-white/40 shrink-0">
                {segment.percentage.toFixed(1)}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
