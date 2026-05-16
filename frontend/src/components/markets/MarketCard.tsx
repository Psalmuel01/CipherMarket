'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp, Calendar, ArrowRight, Shield, Fingerprint } from 'lucide-react';
import LifecycleBadge from '@/components/markets/LifecycleBadge';
import PrivacyBadge from '@/components/ui/PrivacyBadge';
import { formatTokenAmount, formatRelativeExpiry } from '@/lib/formatters';
import type { MarketSummary } from '@/types/market';
import clsx from 'clsx';

export interface MarketCardProps {
  market: MarketSummary;
  index: number;
}

export default function MarketCard({ index, market }: MarketCardProps): JSX.Element {
  return (
    <motion.article
      className="glass-card-premium group relative flex flex-col overflow-hidden rounded-[40px] p-8 transition-all duration-700 hover:scale-[1.02] active:scale-[0.98]"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.8,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <div className="absolute inset-0 bg-black" />

      <div className="relative z-10 flex flex-col h-full space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary bg-primary/5 border border-primary/20 px-3 py-1 rounded-full">
                {market.category}
              </span>
              <PrivacyBadge state="sealed" size="sm" />
            </div>
            <h2 className="text-xl font-serif italic leading-tight tracking-tight text-white group-hover:text-primary transition-colors line-clamp-2">
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
          {market.outcomes.slice(0, 2).map((outcome, idx) => (
            <div key={outcome.id} className="space-y-2">
              <div className="flex justify-between items-end text-[10px] font-mono uppercase tracking-[0.1em]">
                <span className="text-white/50">{outcome.label}</span>
                <span className={clsx("font-bold", idx === 0 ? "text-primary" : "text-white/70")}>
                  {outcome.impliedShare}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05] p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${outcome.impliedShare}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className={clsx(
                    "h-full rounded-full",
                    idx === 0 ? "bg-primary" : "bg-white/20"
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-8 py-6 border-y border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">
              <TrendingUp className="h-3 w-3" />
              <span>Volume</span>
            </div>
            <p className="font-serif italic text-base text-white/80">
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
            <p className="font-serif italic text-base text-white/80">
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
