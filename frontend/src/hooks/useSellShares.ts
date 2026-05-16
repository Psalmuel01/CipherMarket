'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import type { TradeDraft } from '@/types/market';

import useTransactionLifecycle from '@/hooks/useTransactionLifecycle';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import type { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';

export interface UseSellSharesResult {
  state: TransactionLifecycleState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  sellShares: (draft: TradeDraft) => Promise<void>;
  reset: () => void;
}

export default function useSellShares(): UseSellSharesResult {
  const DECRYPT_REQUEST_GAS = 300_000n;
  const SELL_SHARES_GAS = 900_000n;
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();

  const sellShares = async (draft: TradeDraft): Promise<void> => {
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

      const sharesIn = parseUnits(draft.amount || '0', draft.collateralDecimals);
      if (sharesIn <= 0n) {
        throw new Error('Enter a valid share amount.');
      }

      lifecycle.reset();
      lifecycle.setStage('preparing');

      pendingTxId = addTransaction({
        type: 'sell',
        stage: 'preparing',
        txHash: null,
        marketId: draft.marketId,
        marketTitle: draft.marketTitle,
        outcomeLabel: draft.outcomeLabel,
        amount: draft.amount,
        collateralSymbol: 'shares',
      });

      // 1. Request Decrypt
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const requestHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'requestSellPositionDecrypt',
        args: [BigInt(draft.marketId), Number.parseInt(draft.outcomeId, 10)],
        gas: DECRYPT_REQUEST_GAS,
      });

      lifecycle.setTxHash(requestHash);
      lifecycle.setStage('encrypting'); // We'll use encrypting/confirming for the compute wait
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: requestHash });

      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: requestHash });
      if (requestReceipt.status !== 'success') {
        throw new Error('The sell-position decrypt request did not complete successfully.');
      }

      // 2. Wait for Coprocessor (12s)
      lifecycle.setStage('confirming');
      await new Promise((resolve) => window.setTimeout(resolve, 12_000));

      // 3. Sell Transaction
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sellShares',
        args: [
          BigInt(draft.marketId),
          Number.parseInt(draft.outcomeId, 10),
          sharesIn,
          draft.minAmountOut ?? 0n,
        ],
        gas: SELL_SHARES_GAS,
      });

      lifecycle.setTxHash(hash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: hash });

      const sellReceipt = await publicClient.waitForTransactionReceipt({ hash });
      if (sellReceipt.status !== 'success') {
        throw new Error('The sell transaction reverted before completion.');
      }

      lifecycle.setStage('settling');
      updateTransaction(pendingTxId, { stage: 'settling' });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success' });
      toast.success(`Shares sold from ${draft.marketTitle}.`);
    } catch (caughtError) {
      console.error('CipherMarket sell shares failed:', caughtError);
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to sell shares.');

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
    sellShares,
    reset: lifecycle.reset,
  };
}
