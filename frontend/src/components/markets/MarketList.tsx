'use client';

import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, Filter } from 'lucide-react';
import clsx from 'clsx';
import MarketCard from '@/components/markets/MarketCard';
import { getLifecycleLabel } from '@/components/markets/LifecycleBadge';
import Button from '@/components/ui/Button';
import ContentSkeleton from '@/components/ui/ContentSkeleton';
import useMarkets from '@/hooks/useMarkets';
import useAppStore from '@/store/useAppStore';
import type { MarketSummary } from '@/types/market';

type SortKey = 'newest' | 'liquidity' | 'expiry' | 'outcomes';

function sortMarkets(markets: MarketSummary[], sortKey: SortKey): MarketSummary[] {
  return [...markets].sort((left, right) => {
    if (sortKey === 'newest') {
      return right.marketId - left.marketId;
    }
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
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMarkets = useMemo(() => {
    return data.filter(market =>
      market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const sortedMarkets = useMemo(() => {
    return sortMarkets(filteredMarkets, sortKey);
  }, [filteredMarkets, sortKey]);

  return (
    <section className="space-y-8">
      {/* Header & Main Actions */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-[#e8e4df] tracking-tight">
            {heading}
          </h2>
          <p className="text-sm text-white/35 max-w-xl leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Search markets..."
              className="h-10 w-full rounded-xl border border-white/5 bg-white/[0.02] pl-10 pr-4 text-sm text-[#e8e4df] outline-none transition-all focus:border-primary/30 focus:bg-white/[0.04] sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-10 gap-2">
            <Filter className="h-4 w-4" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {availableStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setActiveStatusFilter(status)}
              className={clsx(
                'whitespace-nowrap px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] transition-all rounded-full border',
                activeStatusFilter === status
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-white/[0.02] border-white/5 text-white/30 hover:text-white/50 hover:bg-white/5'
              )}
            >
              {status === 'ALL' ? 'All' : getLifecycleLabel(status)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Sort</span>
          <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.02] border border-white/5">
            {(['newest', 'liquidity', 'expiry', 'outcomes'] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortKey(key)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all',
                  sortKey === key
                    ? 'bg-white/5 text-white shadow-sm'
                    : 'text-white/20 hover:text-white/40'
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ContentSkeleton key={i} variant="market-card" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-[32px] border border-red-500/20 bg-red-500/5 p-8 text-center space-y-3">
          <p className="text-sm text-red-400 font-medium">Unable to load markets</p>
          <p className="text-xs text-red-400/60 max-w-sm mx-auto">{error?.message}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : sortedMarkets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="h-16 w-16 rounded-3xl bg-white/[0.02] flex items-center justify-center border border-white/5">
            <Search className="h-8 w-8 text-white/10" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-white/40">No markets match your criteria</p>
            <p className="text-sm text-white/20">Try adjusting your filters or search query.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setActiveStatusFilter(availableStatuses[0]); }}>
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedMarkets.map((market, index) => (
            <MarketCard key={market.marketId} index={index} market={market} />
          ))}
        </div>
      )}
    </section>
  );
}
