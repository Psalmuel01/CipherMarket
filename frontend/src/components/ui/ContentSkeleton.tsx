'use client';

import clsx from 'clsx';

export type SkeletonVariant =
  | 'market-card'
  | 'position-row'
  | 'analytics-card'
  | 'chart'
  | 'stat-bar'
  | 'text-block';

export interface ContentSkeletonProps {
  variant: SkeletonVariant;
  className?: string;
}

function ShimmerBlock({ className }: { className?: string }): JSX.Element {
  return <div className={clsx('shimmer rounded-lg bg-white/[0.04]', className)} />;
}

function MarketCardSkeleton(): JSX.Element {
  return (
    <div className="glass-card rounded-[32px] p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <ShimmerBlock className="h-2.5 w-16 rounded-full" />
          <ShimmerBlock className="h-5 w-3/4" />
        </div>
        <ShimmerBlock className="h-6 w-6 rounded-xl" />
      </div>
      <div className="space-y-3 pt-4 border-t border-white/[0.05]">
        <div className="flex justify-between">
          <ShimmerBlock className="h-3 w-20" />
          <ShimmerBlock className="h-3 w-16" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-4">
        <ShimmerBlock className="h-2 w-32" />
        <ShimmerBlock className="h-9 w-20 rounded-xl" />
      </div>
    </div>
  );
}

function PositionRowSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 px-8 py-5 md:grid-cols-[2fr,1fr,1fr,1fr,auto] md:items-center md:gap-4">
      <div className="space-y-2">
        <ShimmerBlock className="h-2.5 w-12 rounded-full" />
        <ShimmerBlock className="h-4 w-48" />
      </div>
      <ShimmerBlock className="h-4 w-16" />
      <ShimmerBlock className="h-4 w-20" />
      <ShimmerBlock className="h-5 w-16 rounded-full" />
      <ShimmerBlock className="h-9 w-16 rounded-xl" />
    </div>
  );
}

function AnalyticsCardSkeleton(): JSX.Element {
  return (
    <div className="glass-card rounded-[32px] p-8 space-y-3">
      <ShimmerBlock className="h-2.5 w-24 rounded-full" />
      <ShimmerBlock className="h-8 w-32" />
      <ShimmerBlock className="h-2 w-20" />
    </div>
  );
}

function ChartSkeleton(): JSX.Element {
  return (
    <div className="glass-card rounded-[32px] p-8 space-y-3">
      <div className="flex justify-between items-center">
        <ShimmerBlock className="h-3 w-32 rounded-full" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-6 w-12 rounded-lg" />
          <ShimmerBlock className="h-6 w-12 rounded-lg" />
        </div>
      </div>
      <div className="relative h-48">
        <ShimmerBlock className="absolute bottom-0 left-0 h-32 w-[15%] rounded-t-lg" />
        <ShimmerBlock className="absolute bottom-0 left-[18%] h-40 w-[15%] rounded-t-lg" />
        <ShimmerBlock className="absolute bottom-0 left-[36%] h-24 w-[15%] rounded-t-lg" />
        <ShimmerBlock className="absolute bottom-0 left-[54%] h-36 w-[15%] rounded-t-lg" />
        <ShimmerBlock className="absolute bottom-0 left-[72%] h-28 w-[15%] rounded-t-lg" />
      </div>
    </div>
  );
}

function StatBarSkeleton(): JSX.Element {
  return (
    <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
          <ShimmerBlock className="h-2.5 w-20 rounded-full" />
          <ShimmerBlock className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

function TextBlockSkeleton(): JSX.Element {
  return (
    <div className="space-y-3">
      <ShimmerBlock className="h-3 w-full" />
      <ShimmerBlock className="h-3 w-5/6" />
      <ShimmerBlock className="h-3 w-4/6" />
    </div>
  );
}

const VARIANT_MAP: Record<SkeletonVariant, () => JSX.Element> = {
  'market-card': MarketCardSkeleton,
  'position-row': PositionRowSkeleton,
  'analytics-card': AnalyticsCardSkeleton,
  chart: ChartSkeleton,
  'stat-bar': StatBarSkeleton,
  'text-block': TextBlockSkeleton,
};

export default function ContentSkeleton({ variant, className }: ContentSkeletonProps): JSX.Element {
  const Component = VARIANT_MAP[variant];
  return (
    <div className={className}>
      <Component />
    </div>
  );
}
