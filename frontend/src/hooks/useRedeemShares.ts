'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { formatContractError } from '@/lib/contracts';
import useCipherMarketClient from '@/hooks/useCipherMarketClient';

export interface RedeemSharesReceipt {
  txHash: string;
  amount: bigint;
  formattedAmount: string;
}

import useTransactionLifecycle from '@/hooks/useTransactionLifecycle';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';
import type { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';

export interface UseRedeemSharesResult {
  data: RedeemSharesReceipt | null;
  state: TransactionLifecycleState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  redeemShares: (
    marketId: number,
    amount: bigint,
    symbol: string,
    decimals: number,
    finalOutcomeIndex?: number | null,
  ) => Promise<void>;
  reset: () => void;
}

export default function useRedeemShares(): UseRedeemSharesResult {
  const publicClient = usePublicClient();
  const cipherMarket = useCipherMarketClient();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();
  const [data, setData] = useState<RedeemSharesReceipt | null>(null);

  const redeemShares = async (
    marketId: number,
    amount: bigint,
    symbol: string,
    decimals: number,
    finalOutcomeIndex?: number | null,
  ): Promise<void> => {
    let pendingTxId: string | null = null;
    try {
      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      if (!cipherMarket) {
        throw new Error('CipherMarket client is not available.');
      }

      if (finalOutcomeIndex === null || finalOutcomeIndex === undefined) {
        throw new Error('The finalized winning outcome is not available yet.');
      }

      setData(null);
      lifecycle.reset();
      lifecycle.setStage('preparing');

      pendingTxId = addTransaction({
        type: 'redeem',
        stage: 'preparing',
        txHash: null,
        marketId,
        amount: formatUnits(amount, decimals),
        collateralSymbol: symbol,
      });

      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming' });

      const result = await cipherMarket.redemption.redeemWinningShares({
        marketId,
        finalOutcomeIndex,
      });

      const redeemedAmount = formatUnits(result.amount, decimals);
      if (pendingTxId) {
        updateTransaction(pendingTxId, { amount: redeemedAmount });
      }

      lifecycle.setTxHash(result.hash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: result.hash });

      const redeemReceipt = await publicClient.waitForTransactionReceipt({ hash: result.hash });
      if (redeemReceipt.status !== 'success') {
        throw new Error('The redeem transaction reverted before completion.');
      }

      lifecycle.setStage('settling');
      updateTransaction(pendingTxId, { stage: 'settling' });
      await refreshProtocolData();

      setData({
        txHash: result.hash,
        amount: result.amount,
        formattedAmount: redeemedAmount,
      });
      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success' });
      toast.success(`Redeemed ${redeemedAmount} ${symbol}.`);
    } catch (caughtError) {
      console.error('CipherMarket redeem shares failed:', caughtError);
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to redeem shares.');

      lifecycle.setError(nextError);
      if (pendingTxId) {
        updateTransaction(pendingTxId, { stage: 'error', errorMessage: nextError.message });
      }
      toast.error(nextError.message);
    }
  };

  const reset = (): void => {
    setData(null);
    lifecycle.reset();
  };

  return {
    data,
    state: lifecycle.state,
    isLoading: lifecycle.isLoading,
    isError: lifecycle.isError,
    error: lifecycle.state.error,
    redeemShares,
    reset,
  };
}
