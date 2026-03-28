'use client';

import { useState } from 'react';
import clsx from 'clsx';
import MarketCard from '@/components/markets/MarketCard';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import useMarkets from '@/hooks/useMarkets';
import useAppStore from '@/store/useAppStore';
import { formatAmount, formatRelativeExpiry } from '@/lib/formatters';
import type { MarketSummary } from '@/types/market';

type SortKey = 'liquidity' | 'expiry' | 'outcomes';

function sortMarkets(markets: MarketSummary[], sortKey: SortKey): MarketSummary[] {
  return [...markets].sort((left, right) => {
    if (sortKey === 'liquidity') {
      if (left.totalLiquidity === right.totalLiquidity) {
        return 0;
      }

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
  const sortedMarkets = sortMarkets(data, sortKey);

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-3xl font-medium text-text">{heading}</h2>
          <p className="text-sm leading-6 text-muted">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableStatuses.map((status) => (
            <Button
              key={status}
              onClick={() => setActiveStatusFilter(status)}
              size="sm"
              type="button"
              variant={activeStatusFilter === status ? 'primary' : 'ghost'}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel/72">
        <div className="grid grid-cols-[2fr,1fr,1fr,1fr] border-b border-line px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted">
          <span>Market</span>
          {(['liquidity', 'expiry', 'outcomes'] as SortKey[]).map((value) => (
            <button
              key={value}
              className={clsx(
                'flex items-center justify-end gap-2 text-right',
                sortKey === value ? 'text-teal' : 'text-muted',
              )}
              onClick={() => setSortKey(value)}
              type="button"
            >
              <span>{value}</span>
              <span className={clsx('transition-transform', sortKey === value && 'rotate-180')}>⌃</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : null}

        {isError && error ? (
          <div className="p-4 text-sm text-danger">{error.message}</div>
        ) : null}

        {!isLoading && !isError ? (
          <div className="divide-y divide-line">
            {sortedMarkets.map((market) => (
              <div
                key={market.address}
                className="grid grid-cols-[2fr,1fr,1fr,1fr] px-4 py-4 text-sm text-text"
              >
                <div>
                  <p className="font-medium">{market.title}</p>
                  <p className="mt-1 font-mono text-xs text-muted">{market.category}</p>
                </div>
                <p className="text-right font-mono">{formatAmount(market.totalLiquidity)}</p>
                <p className="text-right font-mono text-muted">{formatRelativeExpiry(market.expiryTime)}</p>
                <p className="text-right font-mono text-muted">{market.outcomeCount}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {sortedMarkets.map((market, index) => (
          <MarketCard key={market.address} index={index} market={market} />
        ))}
      </div>
    </section>
  );
}
