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
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
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
      const addresses = getContractAddresses(chainId);
      const predictionMarketAddress = addresses?.predictionMarket;

      if (!predictionMarketAddress) {
        throw new Error('PredictionMarket is not configured for the current chain.');
      }

      if (!publicClient) {
        throw new Error('Public client is not available.');
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

      if (useDirectFallback) {
        // Direct fallback: skip escrow and open dispute natively
        lifecycle.setStage('approving');
        updateTransaction(pendingTxId, { stage: 'approving' });

        if (collateralToken.toLowerCase() !== zeroAddress) {
          const approvalGasFees = await getBufferedGasFees(publicClient);
          const approveHash = await writeContractAsync({
            address: collateralToken as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [predictionMarketAddress, stakeAmount],
            ...approvalGasFees,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });
        }

        lifecycle.setStage('awaiting_wallet');
        updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

        const disputeGasFees = await getBufferedGasFees(publicClient);
        const hash = await writeContractAsync({
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'openDispute',
          args: [BigInt(marketId), counterOutcomeIndex, stakeAmount],
          value: collateralToken.toLowerCase() === zeroAddress ? stakeAmount : 0n,
          ...disputeGasFees,
        });

        lifecycle.setTxHash(hash);
        lifecycle.setStage('confirming');
        updateTransaction(pendingTxId, { stage: 'confirming', txHash: hash });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        if (receipt.status !== 'success') {
          throw new Error('Dispute transaction reverted on-chain.');
        }

        lifecycle.setStage('success');
        updateTransaction(pendingTxId, { stage: 'success' });
        toast.success(`Dispute registered successfully for ${marketTitle}`);
        await refreshProtocolData();
        return;
      }

      if (collateralToken.toLowerCase() === zeroAddress) {
        throw new Error('Privara escrow disputes will require USDC collateral. Use Direct Custody until the adapter is deployed.');
      }

      throw new Error(
        'Privara escrow is moving into a separate adapter contract. Use Direct Custody until that adapter is deployed and live validated.',
      );
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
