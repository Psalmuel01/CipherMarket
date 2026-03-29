import { Activity, Info } from 'lucide-react';
import type { PoolSnapshot } from '@/types/market';
import clsx from 'clsx';
import { formatAmount } from '@/lib/formatters';

export interface PoolDisplayProps {
  pools: PoolSnapshot[];
  className?: string;
}

export default function PoolDisplay({ pools, className }: PoolDisplayProps): JSX.Element {
  return (
    <div className={clsx("glass-card rounded-3xl p-8 space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Aggregate Liquidity</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Info className="h-3 w-3" />
          Realtime
        </div>
      </div>

      <div className="grid gap-6">
        {pools.map((pool) => (
          <div key={pool.outcomeId} className="space-y-3">
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outcome</p>
                <p className="text-lg font-black text-foreground">{pool.label}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Pool</p>
                <p className="text-lg font-black text-primary">
                  {formatAmount(
                    pool.liquidity,
                    pool.collateralSymbol === 'USDC' ? 6 : 18,
                  )}{' '}
                  {pool.collateralSymbol}
                </p>
              </div>
            </div>
            
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,255,212,0.4)]"
                style={{ width: `${Math.max(pool.percentage, 4)}%` }}
              />
            </div>
            <p className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {pool.percentage}% Market Share
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
