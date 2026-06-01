'use client';

import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { usePublicClient } from 'wagmi';
import { formatContractError } from '@/lib/contracts';
import useCipherMarketClient from '@/hooks/useCipherMarketClient';
import useTransactionLifecycle from '@/hooks/useTransactionLifecycle';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';
import type { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';

export interface UseDisputeEscrowResult {
  state: TransactionLifecycleState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  disputeWithEscrow: (
    marketId: number,
    counterOutcomeIndex: number,
    amount: string,
    decimals: number,
    marketTitle: string,
    outcomeLabel: string,
    collateralToken: string,
    useDirectFallback?: boolean
  ) => Promise<void>;
  reset: () => void;
}

export default function useDisputeEscrow(): UseDisputeEscrowResult {
  const publicClient = usePublicClient();
  const cipherMarket = useCipherMarketClient();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();

  const disputeWithEscrow = async (
    marketId: number,
    counterOutcomeIndex: number,
    amount: string,
    decimals: number,
    marketTitle: string,
    outcomeLabel: string,
    collateralToken: string,
    useDirectFallback = false
  ): Promise<void> => {
    let pendingTxId: string | null = null;
    try {
      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      if (!cipherMarket) {
        throw new Error('CipherMarket client is not available.');
      }

      const stakeAmount = parseUnits(amount || '0', decimals);
      if (stakeAmount <= 0n) {
        throw new Error('Enter a dispute stake greater than zero.');
      }

      lifecycle.reset();
      lifecycle.setStage('preparing');

      pendingTxId = addTransaction({
        type: 'dispute',
        stage: 'preparing',
        txHash: null,
        marketId,
        marketTitle,
        outcomeLabel,
        amount,
        collateralSymbol: collateralToken.toLowerCase() === zeroAddress ? 'ETH' : 'USDC',
      });

      const disputeParams = {
        marketId,
        counterOutcomeIndex,
        stakeAmount,
        collateralToken: collateralToken as `0x${string}`,
      };

      if (useDirectFallback) {
        lifecycle.setStage(collateralToken.toLowerCase() === zeroAddress ? 'awaiting_wallet' : 'approving');
        updateTransaction(pendingTxId, {
          stage: collateralToken.toLowerCase() === zeroAddress ? 'awaiting_wallet' : 'approving',
        });

        const hash = await cipherMarket.disputes.openDirect(disputeParams);
        lifecycle.setTxHash(hash);
        lifecycle.setStage('confirming');
        updateTransaction(pendingTxId, { stage: 'confirming', txHash: hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error('Dispute transaction reverted on-chain.');
        }

        lifecycle.setStage('success');
        updateTransaction(pendingTxId, { stage: 'success' });
        toast.success(`Dispute registered successfully for ${marketTitle}`);
        await refreshProtocolData();
        return;
      }

      lifecycle.setStage('encrypting');
      updateTransaction(pendingTxId, { stage: 'encrypting' });

      const result = await cipherMarket.disputes.openWithReineira(disputeParams);
      lifecycle.setTxHash(result.fundHash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: result.fundHash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: result.fundHash });
      if (receipt.status !== 'success') {
        throw new Error('Reineira escrow funding reverted on-chain.');
      }

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success', txHash: result.fundHash });
      toast.success(`Dispute registered via Reineira successfully for ${marketTitle}`);
      await refreshProtocolData();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error('Unable to open dispute with escrow.');

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
    disputeWithEscrow,
    reset: lifecycle.reset,
  };
}
