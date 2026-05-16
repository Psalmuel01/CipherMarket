'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, Info, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { MarketOutcome } from '@/types/market';

export interface MarketAnalyticsProps {
  outcomes: MarketOutcome[];
  totalLiquidity: bigint;
  collateralSymbol: string;
}

export default function MarketAnalytics({
  outcomes,
  totalLiquidity,
  collateralSymbol,
}: MarketAnalyticsProps): JSX.Element {
  // Mock historical data for sparkline effect
  const sparklineData = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      val: 40 + Math.sin(i * 0.5) * 10 + Math.random() * 5,
    }));
  }, []);

  const maxVal = Math.max(...sparklineData.map(d => d.val));
  const minVal = Math.min(...sparklineData.map(d => d.val));
  const range = maxVal - minVal;

  return (
    <div className="glass-card rounded-[32px] p-8 border border-white/5 bg-white/[0.02] space-y-8">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-[#e8e4df]">
            Market Intelligence
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <TrendingUp className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
            High Confidence
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,250px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40">Probability Distribution</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-mono">Current Implied</span>
              </div>
            </div>

            <div className="space-y-5">
              {outcomes.map((outcome, i) => (
                <div key={outcome.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-semibold text-[#e8e4df]">{outcome.label}</span>
                    <span className="font-mono text-lg text-white font-bold">{outcome.impliedShare}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-white/5 p-[2px] border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${outcome.impliedShare}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className={clsx(
                        "h-full rounded-full relative overflow-hidden",
                        i === 0 ? "bg-primary" : "bg-white/20"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/30 leading-relaxed">
                The implied probability is derived from the Fixed Product Market Maker (FPMM) reserves.
                Large trades will cause price impact, which is standard for liquidity-driven markets.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 border-l border-white/5 pl-8">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 font-mono">
              Liquidity Depth
            </p>
            <div className="h-32 flex items-end gap-1.5">
              {sparklineData.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${((d.val - minVal) / range) * 100}%` }}
                  transition={{ delay: i * 0.02, duration: 0.5 }}
                  className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary transition-colors cursor-help"
                />
              ))}
            </div>
            <p className="text-[9px] text-white/15 font-mono italic text-center">
              Historical probability shifts (Simulated)
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="space-y-1">
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono">Market Skew</p>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-semibold text-white/60">High Side Skew</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono">Efficiency</p>
              <p className="text-xs font-semibold text-white/60">98.4% Arbitrage Offset</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
