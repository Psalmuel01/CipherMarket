import Link from 'next/link';
import { motion } from 'framer-motion';
import LifecycleBadge from '@/components/markets/LifecycleBadge';
import { formatAmount, formatRelativeExpiry } from '@/lib/formatters';
import type { MarketSummary } from '@/types/market';

export interface MarketCardProps {
  market: MarketSummary;
  index: number;
}

export default function MarketCard({ index, market }: MarketCardProps): JSX.Element {
  return (
    <motion.article
      className="rounded-2xl border border-line bg-surface/72 p-5 shadow-panel"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: index * 0.06 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              {market.category}
            </p>
            <h2 className="text-lg font-medium text-text">{market.title}</h2>
          </div>
          <LifecycleBadge status={market.status} />
        </div>
        <p className="font-mono text-sm text-muted">{market.type}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Liquidity</p>
          <p className="mt-2 font-mono text-xl text-text">{formatAmount(market.totalLiquidity)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Expiry</p>
          <p className="mt-2 font-mono text-xl text-text">{formatRelativeExpiry(market.expiryTime)}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {market.outcomes.slice(0, 3).map((outcome) => (
            <span
              key={outcome.id}
              className="rounded-md border border-line px-2 py-1 font-mono text-xs text-muted"
            >
              {outcome.label} {outcome.impliedShare}%
            </span>
          ))}
        </div>
        <Link
          className="font-mono text-xs uppercase tracking-[0.18em] text-teal"
          href={`/markets/${market.address}`}
        >
          Open →
        </Link>
      </div>
    </motion.article>
  );
}

