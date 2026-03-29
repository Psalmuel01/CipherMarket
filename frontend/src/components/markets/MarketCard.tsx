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
      className="glass-card group relative flex flex-col overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_40px_rgba(79,255,212,0.1)]"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {market.category}
            </p>
            <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
              {market.title}
            </h2>
          </div>
          <LifecycleBadge status={market.status} />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-muted-foreground group-hover:text-primary transition-colors">
          <ExternalLink className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6 border-t border-white/5 pt-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>Liquidity</span>
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground">
            {formatTokenAmount(
              market.totalLiquidity,
              market.collateralSymbol === 'USDC' ? 6 : 18,
              market.collateralSymbol,
            )}
          </p>
        </div>
        <div className="space-y-1.5 text-right">
          <div className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Ends In</span>
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground">
            {formatRelativeExpiry(market.expiryTime)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="flex -space-x-2">
          {market.outcomes.slice(0, 3).map((outcome) => (
            <div
              key={outcome.id}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-card text-[10px] font-bold text-foreground ring-1 ring-white/5"
              title={`${outcome.label}: ${outcome.impliedShare}%`}
            >
              {outcome.label[0]}
            </div>
          ))}
          {market.outcomeCount > 3 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-muted-foreground ring-1 ring-white/5">
              +{market.outcomeCount - 3}
            </div>
          )}
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:scale-105 active:scale-95"
          href={`/markets/${market.marketId}`}
        >
          Explore
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.article>
  );
}
