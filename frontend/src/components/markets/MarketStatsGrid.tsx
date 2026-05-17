'use client';

import { motion } from 'framer-motion';
import { Database, TrendingUp, Fingerprint, Activity, CheckCircle } from 'lucide-react';
import useMarkets from '@/hooks/useMarkets';
import { formatTokenAmount } from '@/lib/formatters';
import clsx from 'clsx';

export default function MarketStatsGrid(): JSX.Element {
  const { data: markets, isLoading } = useMarkets();

  const stats = [
    {
      label: 'Sealed Liquidity',
      value: markets.reduce((sum, m) => sum + m.totalLiquidity, 0n),
      icon: Database,
      isToken: true,
      colorClass: 'text-primary',
      glowClass: 'bg-primary/20',
      description: 'Total Value Locked'
    },
    {
      label: 'Active Markets',
      value: markets.filter(m => m.status === 'ACTIVE').length, 
      icon: Activity,
      colorClass: 'text-white/40',
      glowClass: 'bg-white/10',
      description: 'Open for trading'
    },
    {
      label: 'Aggregate Volume',
      value: markets.reduce((sum, m) => sum + m.totalCollateralCollected, 0n),
      icon: TrendingUp,
      isToken: true,
      colorClass: 'text-white/40',
      glowClass: 'bg-white/10',
      description: 'Protocol volume'
    },
    {
      label: 'Resolved Markets',
      value: markets.filter(m => m.status === 'FINALIZED').length,
      icon: CheckCircle,
      colorClass: 'text-white/40',
      glowClass: 'bg-white/10',
      description: 'Settled protocols'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          className="glass-card-premium group relative overflow-hidden rounded-[40px] p-10 transition-all hover:scale-[1.02] bg-black/40"
        >
          <div className="absolute inset-0 bg-black" />

          <div className="relative space-y-8">
            <div className="flex items-center justify-between">
              <div className={clsx(
                "p-4 rounded-2xl bg-white/[0.02] border border-white/5 transition-all duration-500 group-hover:scale-110 group-hover:border-white/10",
                stat.colorClass
              )}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="flex flex-col items-end">
                <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/20 group-hover:text-white/40 transition-colors">
                  {stat.label}
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                   <Fingerprint className="h-3 w-3 text-white/5 group-hover:text-primary transition-colors" />
                   <p className="text-[10px] text-white/10 font-light italic truncate max-w-[80px]">
                    {stat.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-4xl font-serif italic text-white/90 tracking-tight transition-all duration-500 group-hover:text-white group-hover:translate-x-1">
                {isLoading ? (
                  <span className="h-10 w-32 bg-white/5 rounded-xl animate-pulse inline-block" />
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
