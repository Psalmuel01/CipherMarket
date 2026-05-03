import clsx from 'clsx';
import type { MarketLifecycle } from '@/types/market';

export interface StatusDotProps {
  status: MarketLifecycle;
}

export default function StatusDot({ status }: StatusDotProps): JSX.Element {
  return (
    <span
      aria-label={status}
      className={clsx(
        'inline-flex h-2 w-2 rounded-full ring-2 ring-offset-1 ring-offset-background',
        status === 'ACTIVE' && 'bg-primary ring-primary/20 animate-pulse-glow',
        status === 'FINALIZED' && 'bg-emerald-500 ring-emerald-500/20',
        status === 'RESOLUTION_OPEN' && 'bg-amber-500 ring-amber-500/20',
        status === 'ESCALATED' && 'bg-rose-500 ring-rose-500/20',
        status === 'EXPIRED' && 'bg-zinc-500 ring-zinc-500/20',
        status === 'CANCELLED' && 'bg-zinc-700 ring-zinc-700/20',
      )}
    />
  );
}
