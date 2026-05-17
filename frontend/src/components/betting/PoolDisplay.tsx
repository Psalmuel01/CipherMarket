import { Activity, Info } from 'lucide-react';
import type { PoolSnapshot } from '@/types/market';
import clsx from 'clsx';
import { formatAmount } from '@/lib/formatters';
import { getOutcomeColor } from '@/lib/outcomeColors';

export interface PoolDisplayProps {
  pools: PoolSnapshot[];
  className?: string;
}

export default function PoolDisplay({ pools, className }: PoolDisplayProps): JSX.Element {
  return (
    <div className={clsx('glass-card rounded-3xl p-8 space-y-6', className)}>
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Market Depth</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Info className="h-3 w-3" />
          Public state
        </div>
      </div>

      <div className="grid gap-6">
        {pools.map((pool, index) => {
          const color = getOutcomeColor(index);

          return (
            <div key={pool.outcomeId} className="space-y-3">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Outcome
                  </p>
                  <p className="flex items-center gap-2 text-lg font-black text-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: color.hex,
                        boxShadow: `0 0 14px ${color.shadow}`,
                      }}
                    />
                    {pool.label}
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Reserve
                  </p>
                  <p className="text-lg font-black" style={{ color: color.text }}>
                    {formatAmount(pool.reserve, pool.collateralSymbol === 'USDC' ? 6 : 18)}{' '}
                    {pool.collateralSymbol}
                  </p>
                </div>
              </div>

              <div
                className="relative h-3 w-full overflow-hidden rounded-full"
                style={{
                  backgroundColor: color.softBackground,
                  border: `1px solid ${color.border}`,
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${Math.max(pool.percentage, 4)}%`,
                    background: `linear-gradient(90deg, rgba(${color.rgb}, 0.74), ${color.hex})`,
                    boxShadow: `0 0 16px ${color.shadow}`,
                  }}
                />
              </div>
              <p className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {pool.percentage}% implied probability
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
