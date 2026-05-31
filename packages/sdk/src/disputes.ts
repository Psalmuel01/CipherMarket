import type { Address, Hex } from 'viem';
import { parseEventLogs, zeroAddress } from 'viem';
import { Encryptable, assertCorrectEncryptedItemInput } from '@cofhe/sdk';
import { ERC20_ABI, PREDICTION_MARKET_ABI, REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI } from './abi.js';
import { ensureCofheConnected } from './cofhe.js';
import { getBufferedGasFees } from './gas.js';
import { requirePredictionMarketAddress } from './addresses.js';
import type { CipherMarketClientConfig } from './types.js';

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

export interface OpenDisputeParams {
  marketId: number | bigint;
  counterOutcomeIndex: number;
  stakeAmount: bigint;
  collateralToken: Address;
}

type ReineiraEncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: Hex;
};

function toReineiraEncryptedInput(input: unknown): ReineiraEncryptedInput {
  assertCorrectEncryptedItemInput(input as Parameters<typeof assertCorrectEncryptedItemInput>[0]);
  return input as ReineiraEncryptedInput;
}

async function writeContract(
  config: CipherMarketClientConfig,
  request: Record<string, unknown>,
): Promise<Hex> {
  if (!config.walletClient) {
    throw new Error('Wallet client is not available.');
  }

  const account = config.account ?? config.walletClient.account?.address;
  if (!account) {
    throw new Error('Connect your wallet before submitting this action.');
  }

  return (config.walletClient as unknown as {
    writeContract: (request: Record<string, unknown>) => Promise<Hex>;
  }).writeContract({ account, ...request });
}

export async function openDirectDispute(
  config: CipherMarketClientConfig,
  params: OpenDisputeParams,
): Promise<Hex> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const account = config.account ?? config.walletClient?.account?.address;
  if (!account) {
    throw new Error('Please connect your wallet first.');
  }

  if (params.collateralToken.toLowerCase() === zeroAddress) {
    const balance = await config.publicClient.getBalance({ address: account });
    if (balance < params.stakeAmount) {
      throw new Error('Insufficient ETH balance for this dispute stake.');
    }
  } else {
    const balance = await config.publicClient.readContract({
      address: params.collateralToken,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account],
    });
    if (typeof balance === 'bigint' && balance < params.stakeAmount) {
      throw new Error('Insufficient USDC balance for this dispute stake.');
    }

    const approveHash = await writeContract(config, {
      address: params.collateralToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [predictionMarketAddress, params.stakeAmount],
      ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
    });
    await config.publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  return writeContract(config, {
    address: predictionMarketAddress,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'openDispute',
    args: [BigInt(params.marketId), params.counterOutcomeIndex, params.stakeAmount],
    value: params.collateralToken.toLowerCase() === zeroAddress ? params.stakeAmount : 0n,
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });
}

export async function openReineiraDispute(
  config: CipherMarketClientConfig,
  params: OpenDisputeParams,
): Promise<{ createHash: Hex; fundHash: Hex; escrowId: bigint }> {
  const account = config.account ?? config.walletClient?.account?.address;
  if (!account) {
    throw new Error('Please connect your wallet first.');
  }

  const adapterAddress = config.addresses.reineiraDisputeEscrowAdapter;
  if (!adapterAddress) {
    throw new Error('Reineira dispute escrow adapter is not configured for the current chain.');
  }

  if (params.collateralToken.toLowerCase() === zeroAddress) {
    throw new Error('Reineira escrow disputes require USDC collateral. Please use Direct Custody for ETH markets.');
  }

  const reineiraEscrowAddress = await config.publicClient.readContract({
    address: adapterAddress,
    abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
    functionName: 'reineiraEscrow',
  }) as Address;

  if (!reineiraEscrowAddress || reineiraEscrowAddress === zeroAddress) {
    throw new Error('Reineira escrow contract address could not be resolved from the adapter.');
  }

  const resolverData = await config.publicClient.readContract({
    address: adapterAddress,
    abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
    functionName: 'encodeResolverData',
    args: [
      BigInt(params.marketId),
      account,
      params.counterOutcomeIndex,
      params.stakeAmount,
      params.collateralToken,
    ],
  }) as Hex;

  const cofheClient = await ensureCofheConnected(config.cofheClient, config.publicClient, config.walletClient);
  if (!cofheClient.encryptInputs) {
    throw new Error('CoFHE encryption is not available.');
  }

  const [encryptedOwner, encryptedAmount] = await cofheClient
    .encryptInputs([
      Encryptable.address(adapterAddress),
      Encryptable.uint64(params.stakeAmount),
    ])
    .setAccount(account)
    .setChainId(config.chainId)
    .execute();

  const paymentToken = await config.publicClient.readContract({
    address: reineiraEscrowAddress,
    abi: REINEIRA_ESCROW_ABI,
    functionName: 'paymentToken',
  }) as Address;

  const isOperator = await config.publicClient.readContract({
    address: paymentToken,
    abi: CONFIDENTIAL_ERC20_ABI,
    functionName: 'isOperator',
    args: [account, reineiraEscrowAddress],
  }) as boolean;

  if (!isOperator) {
    const operatorHash = await writeContract(config, {
      address: paymentToken,
      abi: CONFIDENTIAL_ERC20_ABI,
      functionName: 'setOperator',
      args: [reineiraEscrowAddress, Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60],
      ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
    });
    await config.publicClient.waitForTransactionReceipt({ hash: operatorHash });
  }

  const createHash = await writeContract(config, {
    address: reineiraEscrowAddress,
    abi: REINEIRA_ESCROW_ABI,
    functionName: 'create',
    args: [
      toReineiraEncryptedInput(encryptedOwner),
      toReineiraEncryptedInput(encryptedAmount),
      adapterAddress,
      resolverData,
    ],
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });
  const createReceipt = await config.publicClient.waitForTransactionReceipt({ hash: createHash });
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

  const [encryptedPayment] = await cofheClient
    .encryptInputs([Encryptable.uint64(params.stakeAmount)])
    .setAccount(account)
    .setChainId(config.chainId)
    .execute();

  const fundHash = await writeContract(config, {
    address: reineiraEscrowAddress,
    abi: REINEIRA_ESCROW_ABI,
    functionName: 'fund',
    args: [escrowId, toReineiraEncryptedInput(encryptedPayment)],
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });

  return { createHash, fundHash, escrowId };
}
