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
  activateReineiraEscrow: (
    marketId: number,
    escrowId: bigint,
    marketTitle: string
  ) => Promise<void>;
  settleReineiraEscrow: (
    marketId: number,
    marketTitle: string,
    refundEligible?: boolean
  ) => Promise<void>;
  reset: () => void;
}

export default function useDisputeEscrow(): UseDisputeEscrowResult {
  const publicClient = usePublicClient();
  const cipherMarket = useCipherMarketClient();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();

  const runDisputeTransaction = async (
    marketId: number,
    marketTitle: string,
    outcomeLabel: string,
    amount: string,
    collateralSymbol: string,
    stageLabel: string,
    execute: () => Promise<`0x${string}`>,
    successMessage: string,
  ): Promise<void> => {
    let pendingTxId: string | null = null;

    try {
      if (!publicClient) {
        throw new Error('Public client is not available.');
      }

      if (!cipherMarket) {
        throw new Error('CipherMarket client is not available.');
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
        collateralSymbol,
      });

      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const hash = await execute();
      lifecycle.setTxHash(hash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: hash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`${stageLabel} reverted on-chain.`);
      }

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success' });
      toast.success(successMessage);
      await refreshProtocolData();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? new Error(formatContractError(caughtError))
          : new Error(`Unable to complete ${stageLabel.toLowerCase()}.`);

      lifecycle.setError(nextError);
      if (pendingTxId) {
        updateTransaction(pendingTxId, { stage: 'error', errorMessage: nextError.message });
      }
      toast.error(nextError.message);
    }
  };

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
      lifecycle.setTxHash(result.activateHash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: result.activateHash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: result.activateHash });
      if (receipt.status !== 'success') {
        throw new Error('Reineira dispute activation reverted on-chain.');
      }

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success', txHash: result.activateHash });
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

  const activateReineiraEscrow = async (
    marketId: number,
    escrowId: bigint,
    marketTitle: string,
  ): Promise<void> => {
    await runDisputeTransaction(
      marketId,
      marketTitle,
      'Reineira activation',
      '0',
      'USDC',
      'Reineira dispute activation',
      () => cipherMarket!.disputes.activateReineira({ marketId, escrowId }),
      `Reineira dispute activated for ${marketTitle}`,
    );
  };

  const settleReineiraEscrow = async (
    marketId: number,
    marketTitle: string,
    refundEligible = false,
  ): Promise<void> => {
    await runDisputeTransaction(
      marketId,
      marketTitle,
      'Reineira settlement',
      '0',
      'USDC',
      'Reineira dispute settlement',
      () => cipherMarket!.disputes.settleReineira({ marketId }),
      refundEligible
        ? `Dispute escrow settled and refund sent for ${marketTitle}`
        : `Dispute escrow settled and stake routed for ${marketTitle}`,
    );
  };

  return {
    state: lifecycle.state,
    isLoading: lifecycle.isLoading,
    isError: lifecycle.isError,
    error: lifecycle.state.error,
    disputeWithEscrow,
    activateReineiraEscrow,
    settleReineiraEscrow,
    reset: lifecycle.reset,
  };
}
