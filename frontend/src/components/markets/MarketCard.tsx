import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, Users, Calendar, ArrowRight } from 'lucide-react';
import LifecycleBadge from '@/components/markets/LifecycleBadge';
import { formatTokenAmount, formatRelativeExpiry } from '@/lib/formatters';
import type { MarketSummary } from '@/types/market';

export interface MarketCardProps {
  market: MarketSummary;
  index: number;
}

export default function MarketCard({ index, market }: MarketCardProps): JSX.Element {
  return (
    <motion.article
      className="glass-card interactive-glow group relative flex flex-col overflow-hidden rounded-[32px] p-6 transition-all duration-500 hover:-translate-y-2"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 100,
        delay: index * 0.08
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary">
              {market.category}
            </p>
            <h2 className="text-lg font-semibold leading-relaxed tracking-tight text-[#e8e4df] transition-colors group-hover:text-primary">
              {market.title}
            </h2>
          </div>
          <LifecycleBadge status={market.status} />
        </div>
        <Link
          href={`/markets/${market.marketId}`}
          className="relative z-20 flex p-1.5 items-center justify-center rounded-xl bg-white/[0.03] text-white/20 hover:text-primary transition-colors border border-white/5 hover:border-primary/20 active:scale-95"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.05] pt-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-white/20">
            <Users className="h-3 w-3" />
            <span>Pool</span>
          </div>
          <p className="font-mono text-base font-semibold tracking-tight text-[#e8e4df]">
            {formatTokenAmount(
              market.totalLiquidity,
              market.collateralSymbol === 'USDC' ? 6 : 18,
              market.collateralSymbol,
            )}
          </p>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-2 text-[9px] font-bold uppercase tracking-widest text-white/20">
            <Calendar className="h-3 w-3" />
            <span>Time</span>
          </div>
          <p className="font-mono text-base font-semibold tracking-tight text-[#e8e4df]">
            {formatRelativeExpiry(market.expiryTime)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          {market.outcomes.slice(0, 2).map((outcome) => (
            <div key={outcome.id} className="flex items-center gap-3 text-[11px] text-white/30">
              <span className="min-w-[48px] text-[#e8e4df] font-medium">{outcome.label}</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${Math.max(outcome.impliedShare, 4)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-white/20">{outcome.impliedShare}%</span>
            </div>
          ))}
        </div>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-bold text-primary-foreground transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
          href={`/markets/${market.marketId}`}
        >
          View
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.article>
  );
}
