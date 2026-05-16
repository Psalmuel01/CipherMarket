'use client';

import { useCallback, useState } from 'react';
import type { ComputeOperation } from '@/components/ui/SecureComputeCard';

export type TransactionStage =
  | 'idle'
  | 'preparing'
  | 'encrypting'
  | 'approving'
  | 'awaiting_wallet'
  | 'confirming'
  | 'settling'
  | 'success'
  | 'error';

export interface TransactionStageInfo {
  stage: TransactionStage;
  label: string;
  description: string;
  computeOperation: ComputeOperation;
  estimatedSeconds?: number;
}

const STAGE_INFO: Record<TransactionStage, Omit<TransactionStageInfo, 'stage'>> = {
  idle: {
    label: 'Ready',
    description: 'Prepare your transaction details.',
    computeOperation: 'idle',
  },
  preparing: {
    label: 'Preparing',
    description: 'Building the transaction parameters.',
    computeOperation: 'encrypting',
    estimatedSeconds: 2,
  },
  encrypting: {
    label: 'Encrypting',
    description: 'Your position is being encrypted client-side using FHE.',
    computeOperation: 'encrypting',
    estimatedSeconds: 5,
  },
  approving: {
    label: 'Approving token',
    description: 'Approve the contract to spend your collateral.',
    computeOperation: 'settling',
  },
  awaiting_wallet: {
    label: 'Confirm in wallet',
    description: 'Review and sign the transaction in your wallet.',
    computeOperation: 'idle',
  },
  confirming: {
    label: 'Confirming',
    description: 'Waiting for the network to confirm your transaction.',
    computeOperation: 'settling',
    estimatedSeconds: 15,
  },
  settling: {
    label: 'Settling',
    description: 'Transaction confirmed, settling final state.',
    computeOperation: 'settling',
    estimatedSeconds: 5,
  },
  success: {
    label: 'Complete',
    description: 'Transaction completed successfully.',
    computeOperation: 'complete',
  },
  error: {
    label: 'Failed',
    description: 'Transaction failed. Your assets are safe.',
    computeOperation: 'error',
  },
};

export interface TransactionLifecycleState {
  stage: TransactionStage;
  info: TransactionStageInfo;
  txHash: string | null;
  error: Error | null;
  /** Index of current stage in the ordered flow (for step indicator) */
  stepIndex: number;
}

export interface UseTransactionLifecycleResult {
  state: TransactionLifecycleState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  setStage: (stage: TransactionStage) => void;
  setTxHash: (hash: string) => void;
  setError: (error: Error) => void;
  reset: () => void;
}

const STAGE_ORDER: TransactionStage[] = [
  'idle',
  'preparing',
  'encrypting',
  'approving',
  'awaiting_wallet',
  'confirming',
  'settling',
  'success',
];

function getStepIndex(stage: TransactionStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : 0;
}

function makeState(
  stage: TransactionStage,
  txHash: string | null = null,
  error: Error | null = null,
): TransactionLifecycleState {
  return {
    stage,
    info: { stage, ...STAGE_INFO[stage] },
    txHash,
    error,
    stepIndex: getStepIndex(stage),
  };
}

export default function useTransactionLifecycle(): UseTransactionLifecycleResult {
  const [state, setState] = useState<TransactionLifecycleState>(makeState('idle'));

  const setStage = useCallback((stage: TransactionStage) => {
    setState((prev) => makeState(stage, prev.txHash, stage === 'error' ? prev.error : null));
  }, []);

  const setTxHash = useCallback((hash: string) => {
    setState((prev) => ({ ...prev, txHash: hash }));
  }, []);

  const setError = useCallback((error: Error) => {
    setState(makeState('error', null, error));
  }, []);

  const reset = useCallback(() => {
    setState(makeState('idle'));
  }, []);

  return {
    state,
    isLoading:
      state.stage !== 'idle' && state.stage !== 'success' && state.stage !== 'error',
    isSuccess: state.stage === 'success',
    isError: state.stage === 'error',
    setStage,
    setTxHash,
    setError,
    reset,
  };
}
