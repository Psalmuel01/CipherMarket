'use client';

import { toast } from 'sonner';
import { parseUnits, zeroAddress } from 'viem';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import {
  ERC20_ABI,
  formatContractError,
  getContractAddresses,
  PREDICTION_MARKET_ABI,
  REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
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

const REINEIRA_ESCROW_ABI = [
  {
    type: 'function',
    name: 'createEscrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'resolverData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export default function useDisputeEscrow(): UseDisputeEscrowResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
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

      if (!userAddress) {
        throw new Error('Please connect your wallet first.');
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

      // Reineira Escrow Flow
      const reineiraDisputeEscrowAdapterAddress = addresses?.reineiraDisputeEscrowAdapter;
      if (!reineiraDisputeEscrowAdapterAddress) {
        throw new Error('Reineira dispute escrow adapter is not configured for the current chain.');
      }

      if (collateralToken.toLowerCase() === zeroAddress) {
        throw new Error('Reineira escrow disputes require USDC collateral. Please use Direct Custody for ETH markets.');
      }

      // Fetch the actual escrow address from the adapter contract
      const reineiraEscrowAddress = (await publicClient.readContract({
        address: reineiraDisputeEscrowAdapterAddress,
        abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
        functionName: 'reineiraEscrow',
      })) as `0x${string}`;

      if (!reineiraEscrowAddress || reineiraEscrowAddress === zeroAddress) {
        throw new Error('Reineira escrow contract address could not be resolved from the adapter.');
      }

      // Generate a globally unique escrowId (256-bit unsigned integer)
      const escrowId = BigInt(Math.floor(Math.random() * 1_000_000_000)) + BigInt(Date.now());

      // Fetch the encoded resolver data from the adapter
      const resolverData = (await publicClient.readContract({
        address: reineiraDisputeEscrowAdapterAddress,
        abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
        functionName: 'encodeResolverData',
        args: [
          BigInt(marketId),
          userAddress,
          counterOutcomeIndex,
          stakeAmount,
          collateralToken as `0x${string}`,
        ],
      })) as `0x${string}`;

      // 1. Approve the Escrow contract to pull the tokens
      lifecycle.setStage('approving');
      updateTransaction(pendingTxId, { stage: 'approving' });

      const approvalGasFees = await getBufferedGasFees(publicClient);
      const approveHash = await writeContractAsync({
        address: collateralToken as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [reineiraEscrowAddress, stakeAmount],
        ...approvalGasFees,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}` });

      // 2. Create the Escrow on Reineira
      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const createEscrowGasFees = await getBufferedGasFees(publicClient);
      const hash = await writeContractAsync({
        address: reineiraEscrowAddress,
        abi: REINEIRA_ESCROW_ABI,
        functionName: 'createEscrow',
        args: [
          escrowId,
          collateralToken as `0x${string}`,
          stakeAmount,
          reineiraDisputeEscrowAdapterAddress, // recipient
          reineiraDisputeEscrowAdapterAddress, // resolver
          resolverData,
        ],
        ...createEscrowGasFees,
      });

      lifecycle.setTxHash(hash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: hash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
      if (receipt.status !== 'success') {
        throw new Error('Escrow dispute transaction reverted on-chain.');
      }

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success' });
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
