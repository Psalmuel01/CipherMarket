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
        'inline-flex h-2.5 w-2.5 rounded-full',
        status === 'ACTIVE' && 'bg-teal animate-pulseDot',
        status === 'FINALIZED' && 'bg-success',
        status === 'PROPOSED' && 'bg-warning',
        status === 'DISPUTED' && 'bg-danger',
        status === 'EXPIRED' && 'bg-white/25',
        status === 'CANCELLED' && 'bg-danger/60',
      )}
    />
  );
}

