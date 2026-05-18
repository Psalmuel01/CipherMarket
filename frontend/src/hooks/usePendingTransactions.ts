'use client';

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TransactionStage } from '@/hooks/useTransactionLifecycle';

export interface PendingTransaction {
  id: string;
  type: 'buy' | 'sell' | 'redeem' | 'addLiquidity' | 'removeLiquidity' | 'propose' | 'dispute' | 'vote' | 'finalize' | 'claimLp' | 'other';
  stage: TransactionStage;
  txHash: string | null;
  marketId?: number;
  marketTitle?: string;
  outcomeLabel?: string;
  amount?: string;
  collateralSymbol?: string;
  createdAt: number;
  updatedAt: number;
  errorMessage?: string;
}

interface PendingTransactionStore {
  transactions: PendingTransaction[];
  addTransaction: (tx: Omit<PendingTransaction, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTransaction: (id: string, updates: Partial<PendingTransaction>) => void;
  removeTransaction: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
}

const usePendingTransactionStore = create<PendingTransactionStore>()(
  persist(
    (set) => ({
      transactions: [],

      addTransaction: (tx) => {
        const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = Date.now();
        set((state) => ({
          transactions: [
            { ...tx, id, createdAt: now, updatedAt: now },
            ...state.transactions,
          ].slice(0, 50), // Keep max 50 entries
        }));
        return id;
      },

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates, updatedAt: Date.now() } : tx,
          ),
        })),

      removeTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        })),

      clearCompleted: () =>
        set((state) => ({
          transactions: state.transactions.filter(
            (tx) => tx.stage !== 'success' && tx.stage !== 'error',
          ),
        })),

      clearAll: () => set({ transactions: [] }),
    }),
    {
      name: 'cipher-pending-transactions',
      partialize: (state) => ({
        transactions: state.transactions.filter(
          // Only persist non-stale transactions (< 24h old)
          (tx) => Date.now() - tx.createdAt < 24 * 60 * 60 * 1000,
        ),
      }),
    },
  ),
);

export interface UsePendingTransactionsResult {
  transactions: PendingTransaction[];
  pending: PendingTransaction[];
  completed: PendingTransaction[];
  hasPending: boolean;
  addTransaction: (tx: Omit<PendingTransaction, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTransaction: (id: string, updates: Partial<PendingTransaction>) => void;
  removeTransaction: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
}

export default function usePendingTransactions(): UsePendingTransactionsResult {
  const store = usePendingTransactionStore();

  // Auto-clean old completed transactions (> 1 hour)
  useEffect(() => {
    const interval = setInterval(() => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      const stale = store.transactions.filter(
        (tx) =>
          (tx.stage === 'success' || tx.stage === 'error') && tx.updatedAt < cutoff,
      );
      for (const tx of stale) {
        store.removeTransaction(tx.id);
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [store]);

  const pending = useMemo(
    () =>
      store.transactions.filter(
        (tx) => tx.stage !== 'success' && tx.stage !== 'error' && tx.stage !== 'idle',
      ),
    [store.transactions],
  );

  const completed = useMemo(
    () =>
      store.transactions.filter(
        (tx) => tx.stage === 'success' || tx.stage === 'error',
      ),
    [store.transactions],
  );

  return {
    transactions: store.transactions,
    pending,
    completed,
    hasPending: pending.length > 0,
    addTransaction: store.addTransaction,
    updateTransaction: store.updateTransaction,
    removeTransaction: store.removeTransaction,
    clearCompleted: store.clearCompleted,
    clearAll: store.clearAll,
  };
}
