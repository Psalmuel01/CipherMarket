'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, ChevronDown, ChevronUp, Clock, XCircle } from 'lucide-react';
import clsx from 'clsx';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import type { PendingTransaction } from '@/hooks/usePendingTransactions';

const TYPE_LABELS: Record<PendingTransaction['type'], string> = {
  buy: 'Buy Shares',
  sell: 'Sell Shares',
  redeem: 'Redeem',
  addLiquidity: 'Add Liquidity',
  removeLiquidity: 'Remove Liquidity',
  propose: 'Propose Outcome',
  dispute: 'Open Dispute',
  vote: 'Cast Vote',
  finalize: 'Finalize Market',
  claimLp: 'Claim LP',
  other: 'Transaction',
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function TransactionItem({ tx }: { tx: PendingTransaction }): JSX.Element {
  const isSuccess = tx.stage === 'success';
  const isError = tx.stage === 'error';
  const isPending = !isSuccess && !isError;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
        isPending && 'bg-primary/[0.04]',
        isSuccess && 'bg-emerald-500/[0.04]',
        isError && 'bg-red-500/[0.04]',
      )}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isPending && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Clock className="h-4 w-4 text-primary" />
          </motion.div>
        )}
        {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        {isError && <XCircle className="h-4 w-4 text-red-400" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground truncate">
          {TYPE_LABELS[tx.type]}
          {tx.marketTitle && (
            <span className="font-normal text-white/30"> · {tx.marketTitle}</span>
          )}
        </p>
        <p className="text-[10px] text-white/25 truncate">
          {isPending && tx.stage !== 'idle' ? tx.stage.replace(/_/g, ' ') : ''}
          {tx.amount && tx.collateralSymbol
            ? `${isPending ? ' · ' : ''}${tx.amount} ${tx.collateralSymbol}`
            : ''}
        </p>
      </div>

      {/* Timestamp */}
      <span className="shrink-0 font-mono text-[9px] text-white/15">
        {formatTimeAgo(tx.updatedAt)}
      </span>
    </div>
  );
}

export default function PendingTransactionPanel(): JSX.Element | null {
  const { transactions, pending, hasPending, clearCompleted } = usePendingTransactions();
  const [expanded, setExpanded] = useState(false);

  // Only show when there are relevant transactions
  const recentTransactions = transactions.filter(
    (tx) => Date.now() - tx.updatedAt < 60 * 60 * 1000 && tx.stage !== 'idle',
  );

  if (recentTransactions.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-40 w-80"
    >
      <div className="rounded-2xl border border-white/[0.08] bg-[#0d1017]/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            {hasPending ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Activity className="h-3.5 w-3.5 text-primary" />
              </motion.div>
            ) : (
              <Activity className="h-3.5 w-3.5 text-white/30" />
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
              {hasPending
                ? `${pending.length} pending`
                : 'Recent'}
            </span>
          </div>
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-white/20" />
          ) : (
            <ChevronUp className="h-3 w-3 text-white/20" />
          )}
        </button>

        {/* Transaction list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {recentTransactions.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </div>
              {recentTransactions.some((tx) => tx.stage === 'success' || tx.stage === 'error') && (
                <div className="border-t border-white/[0.05] px-4 py-2">
                  <button
                    type="button"
                    onClick={clearCompleted}
                    className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
                  >
                    Clear completed
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed preview — show most recent pending */}
        {!expanded && pending.length > 0 && (
          <div className="px-2 py-1.5">
            <TransactionItem tx={pending[0]} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
