import StatusDot from '@/components/ui/StatusDot';
import type { MarketLifecycle } from '@/types/market';

export interface LifecycleBadgeProps {
  status: MarketLifecycle;
}

export default function LifecycleBadge({ status }: LifecycleBadgeProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      <StatusDot status={status} />
      {status}
    </span>
  );
}
