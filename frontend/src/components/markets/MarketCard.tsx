'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, Calendar, ArrowRight, Fingerprint } from 'lucide-react';
import PrivacyBadge from '@/components/ui/PrivacyBadge';
import { formatTokenAmount, formatRelativeExpiry } from '@/lib/formatters';
import { getOutcomeColor } from '@/lib/outcomeColors';
import type { MarketSummary } from '@/types/market';

export interface MarketCardProps {
  market: MarketSummary;
  index: number;
}

export default function MarketCard({ index, market }: MarketCardProps): JSX.Element {
  const visibleOutcomes = market.outcomes.slice(0, 4);

  return (
    <motion.article
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition-all duration-500 hover:-translate-y-1 hover:border-white/15 hover:bg-white/[0.04] active:scale-[0.99]"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <div className="relative z-10 flex h-full flex-col space-y-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-primary">
                {market.category}
              </span>
              <PrivacyBadge state="sealed" size="sm" showTooltip={false} />
              {market.outcomeCount > 4 ? (
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                  +{market.outcomeCount - 4} outcomes
                </span>
              ) : null}
            </div>
            <h2 className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight text-white transition-colors group-hover:text-white">
              {market.title}
            </h2>
          </div>
          <Link
            href={`/markets/${market.marketId}`}
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-white/30 hover:text-primary transition-all border border-white/10 hover:border-primary/40"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {/* Probabilities Section */}
        <div className="space-y-3">
          {visibleOutcomes.map((outcome) => {
            const color = getOutcomeColor(outcome.outcomeIndex);

            return (
              <div key={outcome.id} className="space-y-2">
                <div className="flex items-end justify-between gap-4 text-[10px] font-mono uppercase tracking-[0.1em]">
                  <span className="flex min-w-0 items-center gap-2 text-white/55">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: color.hex,
                        boxShadow: `0 0 12px ${color.shadow}`,
                      }}
                    />
                    <span className="truncate">{outcome.label}</span>
                  </span>
                  <span className="shrink-0 font-bold" style={{ color: color.text }}>
                    {outcome.impliedShare}%
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full p-[1px]"
                  style={{
                    backgroundColor: color.softBackground,
                    border: `1px solid ${color.border}`,
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${outcome.impliedShare}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, rgba(${color.rgb}, 0.72), ${color.hex})`,
                      boxShadow: `0 0 14px ${color.shadow}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6 border-y border-white/10 py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">
              <TrendingUp className="h-3 w-3" />
              <span>Volume</span>
            </div>
            <p className="text-base font-semibold text-white/80">
              {formatTokenAmount(
                market.totalLiquidity,
                market.collateralSymbol === 'USDC' ? 6 : 18,
                market.collateralSymbol,
              )}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">
              <Calendar className="h-3 w-3" />
              <span>Expires</span>
            </div>
            <p className="text-base font-semibold text-white/80">
              {formatRelativeExpiry(market.expiryTime)}
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[9px] text-white/30 font-mono tracking-[0.2em] uppercase">
            <Fingerprint className="h-3.5 w-3.5 text-primary/60" />
            <span>FHE Sealed</span>
          </div>
          <Link
            className="group/btn relative inline-flex h-12 items-center gap-3 rounded-2xl bg-[#080a0f] border border-primary/30 px-6 text-[12px] font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] overflow-hidden"
            href={`/markets/${market.marketId}`}
          >
            <div className="absolute inset-0 bg-primary/5 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500" />
            <span className="relative z-10">Trade Market</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
