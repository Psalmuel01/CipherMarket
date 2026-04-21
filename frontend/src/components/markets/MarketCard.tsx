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
      className="glass-card group relative flex flex-col overflow-hidden rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-12px_rgba(232,83,58,0.15)]"
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
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              {market.category}
            </p>
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
              {market.title}
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {market.description}
            </p>
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
            <span>Collateral</span>
          </div>
          <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
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
          <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
            {formatRelativeExpiry(market.expiryTime)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-4">
        <div className="space-y-2">
          {market.outcomes.slice(0, 2).map((outcome) => (
            <div key={outcome.id} className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="min-w-20 text-foreground">{outcome.label}</span>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${Math.max(outcome.impliedShare, 4)}%` }}
                />
              </div>
              <span className="font-mono text-foreground">{outcome.impliedShare}%</span>
            </div>
          ))}
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
