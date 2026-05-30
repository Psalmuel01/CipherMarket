'use client';

import { toast } from 'sonner';
import { parseEventLogs, parseUnits, zeroAddress } from 'viem';
import { Encryptable, assertCorrectEncryptedItemInput } from '@cofhe/sdk';
import { useCofheContext } from '@cofhe/react';
import { useAccount, useChainId, usePublicClient, useWalletClient, useWriteContract } from 'wagmi';
import { ensureCofheConnected } from '@/lib/cofheClient';
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
    name: 'create',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'encryptedOwner',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      {
        name: 'encryptedAmount',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
      { name: 'resolver', type: 'address' },
      { name: 'resolverData', type: 'bytes' },
    ],
    outputs: [{ name: 'escrowId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'fund',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      {
        name: 'encryptedPayment',
        type: 'tuple',
        components: [
          { name: 'ctHash', type: 'uint256' },
          { name: 'securityZone', type: 'uint8' },
          { name: 'utype', type: 'uint8' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'paymentToken',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event',
    name: 'EscrowCreated',
    inputs: [{ name: 'escrowId', type: 'uint256', indexed: true }],
    anonymous: false,
  },
] as const;

const CONFIDENTIAL_ERC20_ABI = [
  {
    type: 'function',
    name: 'setOperator',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'until', type: 'uint48' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isOperator',
    stateMutability: 'view',
    inputs: [
      { name: 'holder', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

type ReineiraEncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
};

function toReineiraEncryptedInput(input: Parameters<typeof assertCorrectEncryptedItemInput>[0]): ReineiraEncryptedInput {
  assertCorrectEncryptedItemInput(input);
  return input;
}

export default function useDisputeEscrow(): UseDisputeEscrowResult {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { client } = useCofheContext();
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
        if (collateralToken.toLowerCase() === zeroAddress) {
          const balance = await publicClient.getBalance({ address: userAddress });

          if (balance < stakeAmount) {
            throw new Error('Insufficient ETH balance for this dispute stake.');
          }
        } else {
          const balance = (await publicClient.readContract({
            address: collateralToken as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
          })) as bigint;

          if (balance < stakeAmount) {
            throw new Error('Insufficient USDC balance for this dispute stake.');
          }
        }

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

      if (!walletClient) {
        throw new Error('Wallet client is not available.');
      }

      // Fetch the actual escrow address from the adapter contract.
      const reineiraEscrowAddress = (await publicClient.readContract({
        address: reineiraDisputeEscrowAdapterAddress,
        abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
        functionName: 'reineiraEscrow',
      })) as `0x${string}`;

      if (!reineiraEscrowAddress || reineiraEscrowAddress === zeroAddress) {
        throw new Error('Reineira escrow contract address could not be resolved from the adapter.');
      }

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

      await ensureCofheConnected(client, publicClient, walletClient);

      lifecycle.setStage('encrypting');
      updateTransaction(pendingTxId, { stage: 'encrypting' });

      const [encryptedOwner, encryptedAmount] = await client
        .encryptInputs([
          Encryptable.address(reineiraDisputeEscrowAdapterAddress),
          Encryptable.uint64(stakeAmount),
        ])
        .setAccount(userAddress)
        .setChainId(chainId)
        .execute();
      const reineiraEncryptedOwner = toReineiraEncryptedInput(encryptedOwner);
      const reineiraEncryptedAmount = toReineiraEncryptedInput(encryptedAmount);

      const paymentToken = (await publicClient.readContract({
        address: reineiraEscrowAddress,
        abi: REINEIRA_ESCROW_ABI,
        functionName: 'paymentToken',
      })) as `0x${string}`;

      const isOperator = (await publicClient.readContract({
        address: paymentToken,
        abi: CONFIDENTIAL_ERC20_ABI,
        functionName: 'isOperator',
        args: [userAddress, reineiraEscrowAddress],
      })) as boolean;

      if (!isOperator) {
        lifecycle.setStage('approving');
        updateTransaction(pendingTxId, { stage: 'approving' });

        const approvalGasFees = await getBufferedGasFees(publicClient);
        const operatorHash = await writeContractAsync({
          address: paymentToken,
          abi: CONFIDENTIAL_ERC20_ABI,
          functionName: 'setOperator',
          args: [
            reineiraEscrowAddress,
            Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
          ],
          ...approvalGasFees,
        });
        await publicClient.waitForTransactionReceipt({ hash: operatorHash as `0x${string}` });
      }

      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const createGasFees = await getBufferedGasFees(publicClient);
      const createHash = await writeContractAsync({
        address: reineiraEscrowAddress,
        abi: REINEIRA_ESCROW_ABI,
        functionName: 'create',
        args: [
          reineiraEncryptedOwner,
          reineiraEncryptedAmount,
          reineiraDisputeEscrowAdapterAddress,
          resolverData,
        ],
        ...createGasFees,
      });

      lifecycle.setTxHash(createHash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, {
        stage: 'confirming',
        txHash: createHash,
      });

      const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash as `0x${string}` });
      if (createReceipt.status !== 'success') {
        throw new Error('Reineira escrow creation reverted on-chain.');
      }

      const [createdEvent] = parseEventLogs({
        abi: REINEIRA_ESCROW_ABI,
        logs: createReceipt.logs,
        eventName: 'EscrowCreated',
      });
      const escrowId = createdEvent?.args.escrowId;
      if (escrowId === undefined) {
        throw new Error('Reineira escrow was created but no escrow id was emitted.');
      }

      lifecycle.setStage('encrypting');
      updateTransaction(pendingTxId, { stage: 'encrypting' });

      const [encryptedPayment] = await client
        .encryptInputs([Encryptable.uint64(stakeAmount)])
        .setAccount(userAddress)
        .setChainId(chainId)
        .execute();
      const reineiraEncryptedPayment = toReineiraEncryptedInput(encryptedPayment);

      lifecycle.setStage('awaiting_wallet');
      updateTransaction(pendingTxId, { stage: 'awaiting_wallet' });

      const fundGasFees = await getBufferedGasFees(publicClient);
      const fundHash = await writeContractAsync({
        address: reineiraEscrowAddress,
        abi: REINEIRA_ESCROW_ABI,
        functionName: 'fund',
        args: [escrowId, reineiraEncryptedPayment],
        ...fundGasFees,
      });

      lifecycle.setTxHash(fundHash);
      lifecycle.setStage('confirming');
      updateTransaction(pendingTxId, { stage: 'confirming', txHash: fundHash });

      const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundHash as `0x${string}` });
      if (fundReceipt.status !== 'success') {
        throw new Error('Reineira escrow funding reverted on-chain.');
      }

      lifecycle.setStage('success');
      updateTransaction(pendingTxId, { stage: 'success', txHash: fundHash });
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
