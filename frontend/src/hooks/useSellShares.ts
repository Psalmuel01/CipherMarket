'use client';

import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { formatContractError } from '@/lib/contracts';
import useCipherMarketClient from '@/hooks/useCipherMarketClient';
import type { TradeDraft } from '@/types/market';

import useTransactionLifecycle from '@/hooks/useTransactionLifecycle';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';
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
  const publicClient = usePublicClient();
  const cipherMarket = useCipherMarketClient();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();

  const sellShares = async (draft: TradeDraft): Promise<void> => {
    let pendingTxId: string | null = null;
    try {
      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      if (!cipherMarket) {
        throw new Error('CipherMarket client is not available.');
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

      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming' });

      const hash = await cipherMarket.trading.sellShares({
        marketId: draft.marketId,
        outcomeIndex: Number.parseInt(draft.outcomeId, 10),
        sharesIn,
        minCollateralOut: draft.minAmountOut ?? 0n,
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
      await refreshProtocolData();

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
