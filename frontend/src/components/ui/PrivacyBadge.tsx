'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

export type PrivacyState = 'sealed' | 'revealed' | 'partial';

const PRIVACY_CONFIG: Record<
  PrivacyState,
  { icon: typeof Lock; label: string; tooltip: string; color: string }
> = {
  sealed: {
    icon: Lock,
    label: 'Sealed',
    tooltip: 'This data is encrypted on-chain. Only you can reveal it with a self-permit.',
    color: 'text-white/30 bg-white/[0.04] border-white/[0.08]',
  },
  revealed: {
    icon: Eye,
    label: 'Revealed',
    tooltip: 'This data has been decrypted locally. Nothing was added to the chain.',
    color: 'text-primary bg-primary/10 border-primary/20',
  },
  partial: {
    icon: EyeOff,
    label: 'Partial',
    tooltip: 'Some values are revealed locally while others remain encrypted.',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
};

export interface PrivacyBadgeProps {
  state: PrivacyState;
  /** Show text label alongside icon */
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function PrivacyBadge({
  state,
  showLabel = true,
  size = 'sm',
  className,
}: PrivacyBadgeProps): JSX.Element {
  const config = PRIVACY_CONFIG[state];
  const Icon = config.icon;

  return (
    <div className="relative group">
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full border transition-all',
            config.color,
            size === 'sm' && 'px-2 py-0.5',
            size === 'md' && 'px-3 py-1',
            className,
          )}
        >
          <Icon className={clsx(size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {showLabel && (
            <span
              className={clsx(
                'font-mono uppercase tracking-[0.15em]',
                size === 'sm' ? 'text-[8px]' : 'text-[9px]',
              )}
            >
              {config.label}
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
        <div className="rounded-xl border border-white/10 bg-[#0d1017] p-3 text-[11px] text-white/50 leading-relaxed shadow-2xl">
          {config.tooltip}
        </div>
        <div className="mx-auto h-1.5 w-1.5 -mt-[3px] rotate-45 border-b border-r border-white/10 bg-[#0d1017]" />
      </div>
    </div>
  );
}
