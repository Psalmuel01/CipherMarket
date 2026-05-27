'use client';

import { toast } from 'sonner';
import { parseUnits } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  COFHE_TASK_MANAGER_ABI,
  COFHE_TASK_MANAGER_ADDRESS,
  formatContractError,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
} from '@/lib/contracts';
import { getBufferedContractGas, getBufferedGasFees } from '@/lib/gas';
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
  const DECRYPT_REQUEST_GAS = 1_000_000n;
  const SELL_SHARES_GAS = 1_800_000n;
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const lifecycle = useTransactionLifecycle();
  const { addTransaction, updateTransaction } = usePendingTransactions();
  const refreshProtocolData = useProtocolRefresh();

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

      if (!address) {
        throw new Error('Connect your wallet before selling shares.');
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

      const requestGasFees = await getBufferedGasFees(publicClient);
      const outcomeIndex = Number.parseInt(draft.outcomeId, 10);
      const encryptedPositionHandle = (await publicClient.readContract({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getEncryptedUserPositionHandle',
        args: [BigInt(draft.marketId), address, outcomeIndex],
      })) as bigint;

      if (encryptedPositionHandle === 0n) {
        throw new Error('This wallet has no encrypted position to sell for this outcome.');
      }

      // Check if decryption is already done (e.g. from a previous attempt)
      // by calling getDecryptResultSafe directly on the TaskManager —
      // the canonical Fhenix view call for coprocessor readiness.
      const [, alreadyDecrypted] = (await publicClient.readContract({
        address: COFHE_TASK_MANAGER_ADDRESS,
        abi: COFHE_TASK_MANAGER_ABI,
        functionName: 'getDecryptResultSafe',
        args: [encryptedPositionHandle],
      })) as [bigint, boolean];

      if (!alreadyDecrypted) {
        const requestGas = await getBufferedContractGas(
          publicClient,
          {
            account: address,
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'requestSellPositionDecrypt',
            args: [BigInt(draft.marketId), outcomeIndex],
          },
          DECRYPT_REQUEST_GAS,
        );
        try {
          const requestHash = await writeContractAsync({
            address: predictionMarketAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'requestSellPositionDecrypt',
            args: [BigInt(draft.marketId), outcomeIndex],
            gas: requestGas,
            ...requestGasFees,
          });

          lifecycle.setTxHash(requestHash);
          lifecycle.setStage('encrypting');
          updateTransaction(pendingTxId, { stage: 'confirming', txHash: requestHash });

          const requestReceipt = await publicClient.waitForTransactionReceipt({ hash: requestHash });
          if (requestReceipt.status !== 'success') {
            console.warn('Sell decrypt request reverted — assuming already requested in a prior attempt.');
          }
        } catch (e) {
          console.warn('requestSellPositionDecrypt failed — assuming already requested.', e);
        }

        // Poll for Coprocessor Completion using getDecryptResultSafe.
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
              args: [encryptedPositionHandle],
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
            'The coprocessor took too long to decrypt. Please try selling again — the decrypt request has already been submitted on-chain.',
          );
        }
      }

      // 3. Sell Transaction
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const sellGasFees = await getBufferedGasFees(publicClient);
      const sellGas = await getBufferedContractGas(
        publicClient,
        {
          account: address,
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'sellShares',
          args: [
            BigInt(draft.marketId),
            outcomeIndex,
            sharesIn,
            draft.minAmountOut ?? 0n,
          ],
        },
        SELL_SHARES_GAS,
      );
      const hash = await writeContractAsync({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'sellShares',
        args: [
          BigInt(draft.marketId),
          outcomeIndex,
          sharesIn,
          draft.minAmountOut ?? 0n,
        ],
        gas: sellGas,
        ...sellGasFees,
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
