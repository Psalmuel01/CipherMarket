'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import MarketCard from '@/components/markets/MarketCard';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import useMarkets from '@/hooks/useMarkets';
import useAppStore from '@/store/useAppStore';
import { formatAmount } from '@/lib/formatters';
import type { MarketSummary } from '@/types/market';

type SortKey = 'liquidity' | 'expiry' | 'outcomes';

function sortMarkets(markets: MarketSummary[], sortKey: SortKey): MarketSummary[] {
  return [...markets].sort((left, right) => {
    if (sortKey === 'liquidity') {
      if (left.totalLiquidity === right.totalLiquidity) return 0;
      return left.totalLiquidity > right.totalLiquidity ? -1 : 1;
    }

    if (sortKey === 'outcomes') {
      return right.outcomeCount - left.outcomeCount;
    }

    return new Date(left.expiryTime).getTime() - new Date(right.expiryTime).getTime();
  });
}

export interface MarketListProps {
  heading: string;
  description: string;
}

export default function MarketList({ description, heading }: MarketListProps): JSX.Element {
  const { availableStatuses, data, error, isError, isLoading } = useMarkets();
  const activeStatusFilter = useAppStore((state) => state.activeStatusFilter);
  const setActiveStatusFilter = useAppStore((state) => state.setActiveStatusFilter);
  const [sortKey, setSortKey] = useState<SortKey>('liquidity');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMarkets = data.filter(market => 
    market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedMarkets = sortMarkets(filteredMarkets, sortKey);

  return (
    <section className="space-y-10">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-4xl font-black tracking-tight text-foreground lg:text-5xl">
            {heading}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search markets..."
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-foreground outline-none ring-primary/20 transition-all focus:border-primary/50 focus:ring-4 sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatusFilter(status)}
                className={clsx(
                  'px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg',
                  activeStatusFilter === status
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span>{sortedMarkets.length} Markets Found</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sort By</span>
          <div className="flex gap-2">
            {(['liquidity', 'expiry', 'outcomes'] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-all',
                  sortKey === key
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-white/5 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground'
                )}
              >
                {key}
                <ArrowUpDown className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {isError && error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {error.message}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedMarkets.map((market, index) => (
            <MarketCard key={market.address} index={index} market={market} />
          ))}
        </div>
      ) : null}

      {!isLoading && sortedMarkets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">No markets found matching your criteria</p>
          <Button variant="ghost" onClick={() => { setSearchQuery(''); setActiveStatusFilter(availableStatuses[0]); }}>
            Clear all filters
          </Button>
        </div>
      )}
    </section>
  );
}
