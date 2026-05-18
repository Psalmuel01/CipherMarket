'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  ERC20_ABI,
  formatContractError,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import { getBufferedGasFees } from '@/lib/gas';
import type { TradeDraft } from '@/types/market';

import useTransactionLifecycle from '@/hooks/useTransactionLifecycle';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';
import type { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';

export interface UseBuySharesResult {
  state: TransactionLifecycleState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  buyShares: (draft: TradeDraft) => Promise<void>;
  reset: () => void;
}

export default function useBuyShares(): UseBuySharesResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();

  const buyShares = async (draft: TradeDraft): Promise<void> => {
    let pendingTxId: string | null = null;
    try {
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      const collateralAmount = parseUnits(draft.amount || '0', draft.collateralDecimals);
      if (collateralAmount <= 0n) {
        throw new Error('Enter a valid trade amount.');
      }

      lifecycle.reset();
      lifecycle.setStage('preparing');

      // Add to persistent pending store
      pendingTxId = addTransaction({
        type: 'buy',
        stage: 'preparing',
        txHash: null,
        marketId: draft.marketId,
        marketTitle: draft.marketTitle,
        outcomeLabel: draft.outcomeLabel,
        amount: draft.amount,
        collateralSymbol: draft.collateralToken.toLowerCase() === zeroAddress ? 'ETH' : 'USDC', // Fallback for symbol
      });

      // 1. Approval if needed
      if (draft.collateralToken.toLowerCase() !== zeroAddress) {
        lifecycle.setStage('approving');
        updateTransaction(pendingTxId, { stage: 'approving' });

        const approvalGasFees = await getBufferedGasFees(publicClient);
        const approvalHash = await writeContractAsync({
          address: draft.collateralToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [predictionMarketAddress, collateralAmount],
          ...approvalGasFees,
        });

        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }

      // 2. Buy Transaction
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const buyGasFees = await getBufferedGasFees(publicClient);
      const buyHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'buyShares',
        args: [
          BigInt(draft.marketId),
          Number.parseInt(draft.outcomeId, 10),
          collateralAmount,
          draft.minAmountOut ?? 0n,
        ],
        value: draft.collateralToken.toLowerCase() === zeroAddress ? collateralAmount : 0n,
        ...buyGasFees,
      });

      lifecycle.setTxHash(buyHash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: buyHash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
      if (receipt.status !== 'success') {
        throw new Error('The transaction reverted on-chain.');
      }

      lifecycle.setStage('settling');
      updateTransaction(pendingTxId, { stage: 'settling' });

      await refreshProtocolData();

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success' });
      toast.success(`Shares purchased in ${draft.marketTitle}.`);
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to buy shares.');

      lifecycle.setError(nextError);
      if (pendingTxId) {
        updateTransaction(pendingTxId, { stage: 'error', errorMessage: nextError.message });
      }
      toast.error(nextError.message);
    }
  };

  return {
    state: lifecycle.state,
    isLoading: lifecycle.isLoading,
    isError: lifecycle.isError,
    error: lifecycle.state.error,
    buyShares,
    reset: lifecycle.reset,
  };
}
