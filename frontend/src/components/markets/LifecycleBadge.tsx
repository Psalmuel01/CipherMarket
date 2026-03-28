import StatusDot from '@/components/ui/StatusDot';
import type { MarketLifecycle } from '@/types/market';

export interface LifecycleBadgeProps {
  status: MarketLifecycle;
}

export default function LifecycleBadge({ status }: LifecycleBadgeProps): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted">
      <StatusDot status={status} />
      {status}
    </span>
  );
}

