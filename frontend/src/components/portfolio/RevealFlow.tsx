'use client';

import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProgressRing from '@/components/ui/ProgressRing';

export interface RevealFlowProps {
  isRevealed: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onToggle: () => void;
  onRetry?: () => void;
}

export default function RevealFlow({
  isRevealed,
  isLoading,
  isError,
  errorMessage,
  onToggle,
  onRetry,
}: RevealFlowProps): JSX.Element {
  // Loading state — decryption in progress
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] border border-primary/30 bg-primary/[0.02] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:rounded-[28px] sm:p-8"
      >
        <div className="flex flex-col items-center text-center space-y-5">
          <ProgressRing stage="decrypting" size={56} />

          <div className="space-y-2 pt-2">
            <p className="text-sm font-semibold text-[#e8e4df]">
              Decrypting your positions
            </p>
            <p className="text-xs text-white/35 max-w-sm leading-relaxed">
              Creating a self-permit and revealing your encrypted balances from the FHE coprocessor. This may take a moment.
            </p>
          </div>

          {/* Stage indicators */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[9px] font-mono uppercase tracking-[0.15em] sm:gap-6">
            <span className="text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Creating permit
            </span>
            <span className="text-white/15">Decrypting</span>
            <span className="text-white/15">Revealing</span>
          </div>

          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-primary/40" />
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-primary/30">
              Nothing is published on-chain
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[24px] border border-red-500/30 bg-red-500/[0.02] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:rounded-[28px] sm:p-8"
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <Lock className="h-5 w-5 text-red-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-300">Decryption failed</p>
            <p className="text-xs text-white/35 max-w-sm">
              {errorMessage ?? 'Unable to reveal your portfolio. Your assets are safe — this is a local decryption issue.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry ?? onToggle} className="gap-2">
            Try again
          </Button>
        </div>
      </motion.div>
    );
  }

  // Sealed state — prompt to reveal
  if (!isRevealed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition-all hover:bg-white/[0.04] sm:rounded-[28px] sm:p-8"
      >
        <div className="flex flex-col items-center text-center space-y-5">
          <motion.div
            className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Lock className="h-6 w-6 text-white/15" />
          </motion.div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#e8e4df]">
              Your positions are encrypted
            </p>
            <p className="text-xs text-white/30 max-w-sm leading-relaxed">
              Reveal locally to decrypt your current holdings. A self-permit is created client-side — nothing public is added to the chain.
            </p>
          </div>
          <Button onClick={onToggle} className="w-full gap-2 sm:w-auto">
            <Eye className="h-4 w-4" />
            Reveal portfolio
          </Button>
        </div>
      </motion.div>
    );
  }

  // Revealed state — option to hide
  return (
    <div className="flex items-center justify-stretch sm:justify-end">
      <Button variant="outline" size="sm" onClick={onToggle} className="gap-2">
        <EyeOff className="h-4 w-4" />
        Hide values
      </Button>
    </div>
  );
}
