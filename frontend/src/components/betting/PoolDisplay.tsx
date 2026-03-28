import type { PoolSnapshot } from '@/types/market';

export interface PoolDisplayProps {
  pools: PoolSnapshot[];
}

export default function PoolDisplay({ pools }: PoolDisplayProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-line bg-panel/72 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-[0.18em] text-muted">Aggregate Pools</h3>
        <p className="font-mono text-xs text-muted">visible liquidity only</p>
      </div>

      <div className="mt-5 space-y-3">
        {pools.map((pool) => (
          <div key={pool.outcomeId} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text">{pool.label}</span>
              <span className="font-mono text-muted">{pool.liquidity.toString()}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05]">
              <div
                className="h-2 rounded-full bg-teal"
                style={{ width: `${Math.max(pool.percentage, 6)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

