'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract, useWalletClient } from 'wagmi';
import { useCofheContext } from '@cofhe/react';
import { ensureCofheConnected } from '@/lib/cofheClient';
import { getFreshSelfPermit } from '@/lib/cofhePermits';
import {
  formatContractError,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import { isZeroCtHash, normalizeCtHash } from '@/lib/fheHandles';
import { getBufferedContractGas, getBufferedGasFees } from '@/lib/gas';

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
  const REDEEM_SHARES_GAS = 1_400_000n;
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { client } = useCofheContext();
  const { writeContractAsync } = useWriteContract();
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

      // 1. Request Decrypt
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const hasRedeemed = await publicClient.readContract({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'hasRedeemed',
        args: [BigInt(marketId), address],
      });

      if (hasRedeemed) {
        throw new Error('This wallet has already redeemed its winning shares for this market.');
      }

      if (finalOutcomeIndex === null || finalOutcomeIndex === undefined) {
        throw new Error('The finalized winning outcome is not available yet.');
      }

      const encryptedWinningHandle = normalizeCtHash(await publicClient.readContract({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getEncryptedUserPositionHandle',
        args: [BigInt(marketId), address, finalOutcomeIndex],
      }));

      if (isZeroCtHash(encryptedWinningHandle)) {
        throw new Error('This wallet has no encrypted winning position to redeem.');
      }

      await ensureCofheConnected(client, publicClient, walletClient);

      // 1. Get permit
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const permit = await getFreshSelfPermit(
        client,
        chainId,
        address,
        'CipherMarket redeem shares',
      );

      // 2. Perform FHE Decrypt via Coprocessor
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming' });

      const decryptionResult = await client
        .decryptForTx(encryptedWinningHandle)
        .setAccount(address)
        .setChainId(chainId)
        .withPermit(permit)
        .execute();

      const decryptedBalance = BigInt(decryptionResult.decryptedValue);
      const signature = decryptionResult.signature;

      if (decryptedBalance === 0n) {
        throw new Error('This wallet has no winning shares to redeem.');
      }

      const redeemedAmount = formatUnits(decryptedBalance, decimals);
      if (pendingTxId) {
        updateTransaction(pendingTxId, { amount: redeemedAmount });
      }

      // 3. Submit Redeem Transaction
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
          args: [BigInt(marketId), decryptedBalance, signature],
        },
        REDEEM_SHARES_GAS,
      );
      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'redeemShares',
        args: [BigInt(marketId), decryptedBalance, signature],
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

      setData({
        txHash: hash,
        amount: decryptedBalance,
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
