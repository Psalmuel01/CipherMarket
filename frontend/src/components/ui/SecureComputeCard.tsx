'use client';

import { motion } from 'framer-motion';
import { Lock, Unlock, ShieldCheck, Cpu, RefreshCcw, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import ProgressRing from '@/components/ui/ProgressRing';
import type { ProgressRingStage } from '@/components/ui/ProgressRing';
import Button from '@/components/ui/Button';

export type ComputeOperation =
  | 'encrypting'
  | 'decrypting'
  | 'proving'
  | 'verifying'
  | 'settling'
  | 'syncing'
  | 'queuing'
  | 'idle'
  | 'complete'
  | 'error';

const OPERATION_CONFIG: Record<
  ComputeOperation,
  {
    icon: typeof Lock;
    title: string;
    description: string;
    ringStage: ProgressRingStage;
  }
> = {
  encrypting: {
    icon: Lock,
    title: 'Encrypting your position',
    description: 'Your stake is being encrypted client-side using the CoFHE SDK. No server sees your plaintext data.',
    ringStage: 'encrypting',
  },
  decrypting: {
    icon: Unlock,
    title: 'Decrypting your balance',
    description: 'Creating a self-permit and requesting the FHE coprocessor to verify your encrypted position.',
    ringStage: 'decrypting',
  },
  proving: {
    icon: ShieldCheck,
    title: 'Generating proof',
    description: 'A cryptographic proof is being generated to validate this operation without revealing your position.',
    ringStage: 'proving',
  },
  verifying: {
    icon: ShieldCheck,
    title: 'Verifying on coprocessor',
    description: 'The FHE coprocessor is verifying your encrypted balance. This typically takes 8–15 seconds.',
    ringStage: 'verifying',
  },
  settling: {
    icon: Cpu,
    title: 'Settling transaction',
    description: 'Waiting for the network to confirm and settle your transaction on-chain.',
    ringStage: 'settling',
  },
  syncing: {
    icon: RefreshCcw,
    title: 'Syncing state',
    description: 'Synchronizing the latest market state from the network.',
    ringStage: 'syncing',
  },
  queuing: {
    icon: Cpu,
    title: 'Queued for execution',
    description: 'Your operation is queued and will be processed shortly.',
    ringStage: 'indeterminate',
  },
  idle: {
    icon: Lock,
    title: 'Ready',
    description: 'No secure computation in progress.',
    ringStage: 'indeterminate',
  },
  complete: {
    icon: CheckCircle2,
    title: 'Complete',
    description: 'Secure computation finished successfully.',
    ringStage: 'indeterminate',
  },
  error: {
    icon: Lock,
    title: 'Operation failed',
    description: 'Something went wrong during secure computation. Your assets are safe.',
    ringStage: 'indeterminate',
  },
};

export interface SecureComputeCardProps {
  operation: ComputeOperation;
  /** Progress 0–100, omit for indeterminate */
  progress?: number;
  /** Estimated seconds remaining */
  estimatedSeconds?: number;
  /** Error message if operation === 'error' */
  errorMessage?: string;
  /** Called when user clicks retry on error state */
  onRetry?: () => void;
  className?: string;
}

export default function SecureComputeCard({
  operation,
  progress,
  estimatedSeconds,
  errorMessage,
  onRetry,
  className,
}: SecureComputeCardProps): JSX.Element {
  const config = OPERATION_CONFIG[operation];
  const Icon = config.icon;
  const isError = operation === 'error';
  const isComplete = operation === 'complete';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={clsx(
        'rounded-2xl border p-5 transition-all',
        isError
          ? 'border-red-500/20 bg-red-500/[0.05]'
          : isComplete
            ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
            : 'border-primary/20 bg-primary/[0.04] secure-compute-bg',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {/* Progress ring or icon */}
        <div className="shrink-0">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </motion.div>
          ) : isError ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 border border-red-500/25">
              <Icon className="h-5 w-5 text-red-400" />
            </div>
          ) : (
            <ProgressRing
              progress={progress}
              stage={config.ringStage}
              size={48}
              strokeWidth={2.5}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={clsx(
            'text-sm font-semibold',
            isError ? 'text-red-300' : isComplete ? 'text-emerald-300' : 'text-foreground',
          )}>
            {config.title}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isError && errorMessage ? errorMessage : config.description}
          </p>

          {/* Estimated time */}
          {estimatedSeconds !== undefined && !isError && !isComplete && (
            <p className="font-mono text-[10px] text-white/25">
              ~{estimatedSeconds}s remaining
            </p>
          )}

          {/* Safety reassurance */}
          {!isComplete && !isError && operation !== 'idle' && (
            <div className="flex items-center gap-1.5 pt-1">
              <ShieldCheck className="h-3 w-3 text-primary/50" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-primary/40">
                Your assets are safe
              </span>
            </div>
          )}

          {/* Retry button */}
          {isError && onRetry && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                <RefreshCcw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
