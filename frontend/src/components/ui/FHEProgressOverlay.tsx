'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck, Cpu } from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';

export interface FHEProgressOverlayProps {
  /** Whether overlay is visible */
  active: boolean;
  /** What the coprocessor is doing */
  operation: 'decrypt_balance' | 'verify_position' | 'encrypt_input';
  /** 0–100 for determinate progress, omit for indeterminate */
  progress?: number;
  /** Estimated seconds remaining */
  estimatedSeconds?: number;
  /** Allow cancellation */
  onCancel?: () => void;
}

const OPERATION_META: Record<
  FHEProgressOverlayProps['operation'],
  { title: string; description: string; detail: string }
> = {
  decrypt_balance: {
    title: 'Verifying encrypted balance',
    description: 'The FHE coprocessor is decrypting and verifying your on-chain position. This typically takes 8–15 seconds.',
    detail: 'A decrypt request has been submitted to the coprocessor network. Your encrypted balance handle is being resolved against the access control list using your self-permit.',
  },
  verify_position: {
    title: 'Verifying position for sell',
    description: 'Your encrypted position is being validated before the sell order can execute. This ensures you hold sufficient shares.',
    detail: 'The contract has forwarded your position handle to the coprocessor for plaintext verification. Once confirmed, the sell transaction can proceed.',
  },
  encrypt_input: {
    title: 'Encrypting trade input',
    description: 'Your trade parameters are being encrypted client-side before submission to the contract.',
    detail: 'The CoFHE SDK is encrypting your input values using the network\'s public key. The encrypted ciphertext will be submitted on-chain.',
  },
};

export default function FHEProgressOverlay({
  active,
  operation,
  progress,
  estimatedSeconds,
  onCancel,
}: FHEProgressOverlayProps): JSX.Element | null {
  const meta = OPERATION_META[operation];

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          {/* Main card */}
          <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-6 secure-compute-bg">
            <div className="flex items-start gap-5">
              {/* Progress ring */}
              <div className="shrink-0 pt-1">
                <ProgressRing
                  progress={progress}
                  stage="verifying"
                  size={52}
                  strokeWidth={2.5}
                />
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#e8e4df]">{meta.title}</h3>
                  <p className="text-xs text-white/35 leading-relaxed mt-1">
                    {meta.description}
                  </p>
                </div>

                {/* Timer */}
                {estimatedSeconds !== undefined && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5">
                    <Cpu className="h-3 w-3 text-primary/50" />
                    <span className="font-mono text-[10px] text-white/30">
                      ~{estimatedSeconds}s remaining
                    </span>
                  </div>
                )}

                {/* Safety badge */}
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-primary/40" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-primary/30">
                    Your assets are safe during this operation
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical detail (expandable) */}
          <details className="group">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-white/15 hover:text-white/25 transition-colors">
              Technical details
            </summary>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 rounded-xl bg-white/[0.02] border border-white/5 p-4"
            >
              <p className="text-[11px] text-white/25 leading-relaxed font-mono">
                {meta.detail}
              </p>
            </motion.div>
          </details>

          {/* Cancel option */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="font-mono text-[10px] text-white/15 hover:text-white/30 transition-colors"
            >
              Cancel operation
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
