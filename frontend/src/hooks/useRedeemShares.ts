'use client';

import { toast } from 'sonner';
import { formatUnits } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  COFHE_TASK_MANAGER_ABI,
  COFHE_TASK_MANAGER_ADDRESS,
  formatContractError,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import { getBufferedContractGas, getBufferedGasFees } from '@/lib/gas';

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

      const encryptedWinningHandle = (await publicClient.readContract({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getEncryptedUserPositionHandle',
        args: [BigInt(marketId), address, finalOutcomeIndex],
      })) as bigint;

      if (encryptedWinningHandle === 0n) {
        throw new Error('This wallet has no encrypted winning position to redeem.');
      }

      const requestGasFees = await getBufferedGasFees(publicClient);

      // Check if decryption is already done (e.g. from a previous attempt)
      // by calling getDecryptResultSafe directly on the TaskManager — the
      // canonical Fhenix view call for coprocessor readiness.
      const [, alreadyDecrypted] = (await publicClient.readContract({
        address: COFHE_TASK_MANAGER_ADDRESS,
        abi: COFHE_TASK_MANAGER_ABI,
        functionName: 'getDecryptResultSafe',
        args: [encryptedWinningHandle],
      })) as [bigint, boolean];

      if (!alreadyDecrypted) {
        // 1. Request Decrypt — the contract calls _allowForFheDecryption internally,
        //    so we do NOT need a separate allowForDecryption transaction.
        lifecycle.setStage('awaiting_wallet');
        updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

        const requestGas = await getBufferedContractGas(
          publicClient,
          {
            account: address,
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'requestRedeemPositionDecrypt',
            args: [BigInt(marketId)],
          },
          DECRYPT_REQUEST_GAS,
        );
        try {
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
            console.warn('Decrypt request reverted — assuming already requested in a prior attempt.');
          }
        } catch (e) {
          // If this fails it likely means the decrypt was already requested in
          // a previous attempt that failed at the redeemShares step.
          console.warn('requestRedeemPositionDecrypt failed — assuming already requested.', e);
        }

        // 2. Poll for Coprocessor Completion.
        // Use getDecryptResultSafe — a cheap view call — to check readiness.
        // Poll up to 60 × 5s = 5 minutes before giving up.
        lifecycle.setStage('confirming');
        let isReady = false;
        const MAX_POLL_ATTEMPTS = 60;
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          await new Promise((resolve) => window.setTimeout(resolve, 5_000));
          try {
            const [, decrypted] = (await publicClient.readContract({
              address: COFHE_TASK_MANAGER_ADDRESS,
              abi: COFHE_TASK_MANAGER_ABI,
              functionName: 'getDecryptResultSafe',
              args: [encryptedWinningHandle],
            })) as [bigint, boolean];
            if (decrypted) {
              isReady = true;
              break;
            }
          } catch (e) {
            // View call failed — keep polling
          }
        }

        if (!isReady) {
          throw new Error(
            'The coprocessor took too long to decrypt. Please try claiming again — the decrypt request has already been submitted on-chain.',
          );
        }
      }

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
