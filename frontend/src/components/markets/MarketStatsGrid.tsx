'use client';

import { motion } from 'framer-motion';
import { Database, TrendingUp, Fingerprint, Activity, CheckCircle } from 'lucide-react';
import useMarkets from '@/hooks/useMarkets';
import { formatTokenAmount } from '@/lib/formatters';
import { getOutcomeColor } from '@/lib/outcomeColors';

export default function MarketStatsGrid(): JSX.Element {
  const { data: markets, isLoading } = useMarkets();

  const stats = [
    {
      label: 'Sealed Liquidity',
      value: markets.reduce((sum, m) => sum + m.totalLiquidity, 0n),
      icon: Database,
      isToken: true,
      description: 'Total value locked',
      color: getOutcomeColor(0),
    },
    {
      label: 'Active Markets',
      value: markets.filter(m => m.status === 'ACTIVE').length,
      icon: Activity,
      description: 'Open for trading',
      color: getOutcomeColor(1),
    },
    {
      label: 'Aggregate Volume',
      value: markets.reduce((sum, m) => sum + m.totalCollateralCollected, 0n),
      icon: TrendingUp,
      isToken: true,
      description: 'Protocol volume',
      color: getOutcomeColor(2),
    },
    {
      label: 'Resolved Markets',
      value: markets.filter(m => m.status === 'FINALIZED').length,
      icon: CheckCircle,
      description: 'Settled protocols',
      color: getOutcomeColor(3),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: i * 0.1,
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1]
          }}
          className="group relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]"
        >
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <div
                className="rounded-2xl border p-3 transition-all duration-500 group-hover:scale-105"
                style={{
                  backgroundColor: stat.color.softBackground,
                  borderColor: stat.color.border,
                  color: stat.color.text,
                  boxShadow: `0 0 24px ${stat.color.shadow}`,
                }}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col items-end">
                <p className="text-right font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 transition-colors group-hover:text-white/45">
                  {stat.label}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <Fingerprint
                    className="h-3 w-3 transition-colors"
                    style={{ color: stat.color.text }}
                  />
                  <p className="max-w-[110px] truncate text-[10px] text-white/25">
                    {stat.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-2xl font-semibold tracking-tight text-white transition-all duration-500 group-hover:text-white">
                {isLoading ? (
                  <span className="inline-block h-10 w-32 animate-pulse rounded-xl bg-white/5" />
                ) : stat.isToken ? (
                  formatTokenAmount(stat.value as bigint, 18, 'USDC')
                ) : (
                  stat.value.toLocaleString()
                )}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
