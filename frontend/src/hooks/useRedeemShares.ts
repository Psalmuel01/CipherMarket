'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { formatContractError, getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getBufferedContractGas, getBufferedGasFees, requireBufferedContractGas } from '@/lib/gas';

export interface RedeemSharesReceipt {
  txHash: string;
  amount: string;
}

import useTransactionLifecycle from '@/hooks/useTransactionLifecycle';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';
import type { TransactionLifecycleState } from '@/hooks/useTransactionLifecycle';

export interface UseRedeemSharesResult {
  state: TransactionLifecycleState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  redeemShares: (marketId: number, amount: bigint, symbol: string, decimals: number) => Promise<void>;
  reset: () => void;
}

export default function useRedeemShares(): UseRedeemSharesResult {
  const DECRYPT_REQUEST_GAS = 1_000_000n;
  const REDEEM_SHARES_GAS = 1_400_000n;
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();

  const redeemShares = async (
    marketId: number,
    amount: bigint,
    symbol: string,
    decimals: number,
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

      if (!address) {
        throw new Error('Connect your wallet before redeeming shares.');
      }

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

      // 1. Request Decrypt
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const requestGasFees = await getBufferedGasFees(publicClient);
      const requestGas = await requireBufferedContractGas(
        publicClient,
        {
          account: address,
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'requestRedeemPositionDecrypt',
          args: [BigInt(marketId)],
        },
      );
      const requestHash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'requestRedeemPositionDecrypt',
        args: [BigInt(marketId)],
        gas: requestGas,
        ...requestGasFees,
      });

      lifecycle.setTxHash(requestHash);
      lifecycle.setStage('encrypting');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: requestHash });

      const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: requestHash });
      if (requestReceipt.status !== 'success') {
        throw new Error('The redeem-position decrypt request reverted after submission.');
      }

      // 2. Wait for Coprocessor (12s)
      lifecycle.setStage('confirming');
      await new Promise((resolve) => window.setTimeout(resolve, 12_000));

      // 3. Redeem Transaction
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const redeemGasFees = await getBufferedGasFees(publicClient);
      const redeemGas = await getBufferedContractGas(
        publicClient,
        {
          account: address,
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'redeemShares',
          args: [BigInt(marketId)],
        },
        REDEEM_SHARES_GAS,
      );
      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'redeemShares',
        args: [BigInt(marketId)],
        gas: redeemGas,
        ...redeemGasFees,
      });

      lifecycle.setTxHash(hash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: hash });

      const redeemReceipt = await publicClient.waitForTransactionReceipt({ hash });
      if (redeemReceipt.status !== 'success') {
        throw new Error('The redeem transaction reverted before completion.');
      }

      lifecycle.setStage('settling');
      updateTransaction(pendingTxId, { stage: 'settling' });
      await refreshProtocolData();

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success' });
      toast.success(`Redeemed ${formatUnits(amount, decimals)} ${symbol}.`);
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

  return {
    state: lifecycle.state,
    isLoading: lifecycle.isLoading,
    isError: lifecycle.isError,
    error: lifecycle.state.error,
    redeemShares,
    reset: lifecycle.reset,
  };
}
