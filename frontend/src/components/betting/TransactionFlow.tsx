'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import StepIndicator, { Step } from '@/components/ui/StepIndicator';
import SecureComputeCard from '@/components/ui/SecureComputeCard';
import type { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';
import Button from '@/components/ui/Button';

export interface TransactionFlowProps {
  state: TransactionLifecycleState;
  steps: Step[];
  successTitle?: string;
  successDescription?: string;
  onClose?: () => void;
  onRetry?: () => void;
  children?: React.ReactNode; // For the initial input state
}

export default function TransactionFlow({
  state,
  steps,
  successTitle = 'Transaction successful',
  successDescription = 'Your transaction has been confirmed on the network.',
  onClose,
  onRetry,
  children,
}: TransactionFlowProps): JSX.Element {
  const { stage, info, txHash, error, stepIndex } = state;

  const isIdle = stage === 'idle';
  const isSuccess = stage === 'success';
  const isError = stage === 'error';
  const isProcessing = !isIdle && !isSuccess && !isError;

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <StepIndicator
        steps={steps}
        currentStepIndex={stepIndex}
        variant="expanded"
        className="px-2"
      />

      <div className="min-h-[200px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isIdle ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              {children}
            </motion.div>
          ) : isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 py-4"
            >
              <div className="flex justify-center">
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-emerald-500/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#e8e4df]">{successTitle}</h3>
                <p className="text-sm text-white/35 max-w-sm mx-auto leading-relaxed">
                  {successDescription}
                </p>
              </div>
              {txHash && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/5 font-mono text-[10px] text-white/25">
                  TX: <span className="text-white/40">{txHash.slice(0, 12)}...{txHash.slice(-8)}</span>
                </div>
              )}
              {onClose && (
                <div className="pt-4">
                  <Button onClick={onClose} className="w-full">
                    Close
                  </Button>
                </div>
              )}
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6 py-4"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-[#e8e4df]">Transaction failed</h3>
                <p className="text-sm text-red-400/80 max-w-sm mx-auto leading-relaxed">
                  {error?.message || 'Something went wrong during the transaction.'}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                {onRetry && (
                  <Button onClick={onRetry} variant="primary">
                    Try again
                  </Button>
                )}
                {onClose && (
                  <Button onClick={onClose} variant="outline">
                    Go back
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <SecureComputeCard
                operation={info.computeOperation}
                progress={undefined} // Could be passed if available
                estimatedSeconds={info.estimatedSeconds}
                className="w-full"
              />

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex gap-3 items-start">
                <Info className="h-4 w-4 text-white/20 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.1em]">
                    What's happening
                  </p>
                  <p className="text-[12px] text-white/25 leading-relaxed">
                    {info.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-primary/40" />
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-primary/30">
                  Your assets are safe
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
