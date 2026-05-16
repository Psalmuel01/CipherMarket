'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Wallet, BarChart3, Trophy } from 'lucide-react';
import clsx from 'clsx';
import PrivacyBadge from '@/components/ui/PrivacyBadge';
import type { PrivacyState } from '@/components/ui/PrivacyBadge';
import InfoTooltip from '@/components/ui/InfoTooltip';

export interface PortfolioSummaryBarProps {
  totalPositions: number;
  estimatedValue: string | null;
  marketsParticipated: number;
  redeemableCount: number;
  privacyState: PrivacyState;
  isLoading: boolean;
}

interface StatCardProps {
  icon: typeof TrendingUp;
  label: string;
  value: string | number;
  subtitle?: string;
  highlight?: boolean;
  tooltip?: { title: string; body: string };
}

function StatCard({ icon: Icon, label, value, subtitle, highlight, tooltip }: StatCardProps): JSX.Element {
  return (
    <div
      className={clsx(
        'glass-card interactive-glow rounded-[24px] p-6 relative overflow-hidden transition-all duration-500',
        highlight && 'glass-card--active decrypt-pulse',
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
            {label}
          </p>
          {tooltip && (
            <InfoTooltip title={tooltip.title} body={tooltip.body} />
          )}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={String(value)}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="font-mono text-2xl font-medium text-[#e8e4df] tracking-[-0.02em]"
        >
          {value}
        </motion.p>
      </AnimatePresence>
      {subtitle && (
        <p className="mt-1 font-mono text-[10px] text-white/20">{subtitle}</p>
      )}
    </div>
  );
}

export default function PortfolioSummaryBar({
  totalPositions,
  estimatedValue,
  marketsParticipated,
  redeemableCount,
  privacyState,
  isLoading,
}: PortfolioSummaryBarProps): JSX.Element {
  const isRevealed = privacyState === 'revealed';

  return (
    <div className="space-y-3">
      {/* Privacy status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PrivacyBadge state={privacyState} size="md" />
          <p className="text-xs text-white/30">
            {privacyState === 'sealed'
              ? 'Values are hidden. Reveal locally to see your positions.'
              : privacyState === 'revealed'
                ? 'Decrypted locally. Nothing was published on-chain.'
                : 'Some values are visible while others remain encrypted.'}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Open positions"
          value={isLoading ? '...' : isRevealed ? totalPositions : '••'}
          tooltip={{
            title: 'Private Positions',
            body: 'Your cumulative per-outcome balances are encrypted on-chain. This count is only visible after local decryption.',
          }}
        />
        <StatCard
          icon={TrendingUp}
          label="Est. portfolio value"
          value={isLoading ? '...' : isRevealed && estimatedValue ? estimatedValue : '••••'}
          subtitle={isRevealed ? 'Based on current market prices' : undefined}
          tooltip={{
            title: 'Estimated Value',
            body: 'Computed from your revealed share counts multiplied by current market probabilities. This is not a guarantee of payout.',
          }}
        />
        <StatCard
          icon={BarChart3}
          label="Markets joined"
          value={marketsParticipated}
        />
        <StatCard
          icon={Trophy}
          label="Redeemable"
          value={isLoading ? '...' : isRevealed ? redeemableCount : '••'}
          highlight={isRevealed && redeemableCount > 0}
          subtitle={isRevealed && redeemableCount > 0 ? 'Claim your winnings' : undefined}
        />
      </div>
    </div>
  );
}
