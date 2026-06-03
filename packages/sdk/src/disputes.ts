import type { Address, Hex } from 'viem';
import { parseEventLogs, zeroAddress } from 'viem';
import { Encryptable, assertCorrectEncryptedItemInput } from '@cofhe/sdk';
import { ERC20_ABI, PREDICTION_MARKET_ABI, REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI } from './abi.js';
import { ensureCofheConnected } from './cofhe.js';
import { getBufferedGasFees } from './gas.js';
import { requirePredictionMarketAddress } from './addresses.js';
import { getMarket } from './markets.js';
import type { CipherMarketClientConfig } from './types.js';

const MARKET_STATE_FINALIZED = 4;

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

export interface ReineiraDisputeStatusInput {
  marketState: number;
  disputeOpened: boolean;
  disputeRefundsEnabled: boolean;
  marketDisputeAdapter: Address | null;
  escrowId: bigint | null;
  escrowRegistered: boolean;
  escrowActivated: boolean;
  escrowSettled: boolean;
}

export interface ReineiraDisputeStatus {
  usesReineira: boolean;
  adapterAddress: Address | null;
  escrowId: bigint | null;
  escrowRegistered: boolean;
  escrowActivated: boolean;
  escrowSettled: boolean;
  needsActivation: boolean;
  needsSettlement: boolean;
  disputeRefundsEnabled: boolean | null;
  marketState: number;
}

type ReineiraEncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: Hex;
};

const ACTIVATE_DISPUTE_SELECTOR = '0xd76c367c';

const LEGACY_DISPUTE_ESCROW_ABI = [
  {
    type: 'function',
    name: 'disputeEscrows',
    stateMutability: 'view',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [
      { name: 'registered', type: 'bool' },
      { name: 'settled', type: 'bool' },
      { name: 'marketId', type: 'uint256' },
      { name: 'disputer', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'stakeAmount', type: 'uint128' },
      { name: 'counterOutcome', type: 'uint8' },
    ],
  },
] as const;

function toReineiraEncryptedInput(input: unknown): ReineiraEncryptedInput {
  assertCorrectEncryptedItemInput(input as Parameters<typeof assertCorrectEncryptedItemInput>[0]);
  return input as ReineiraEncryptedInput;
}

export function deriveReineiraDisputeStatus(input: ReineiraDisputeStatusInput): ReineiraDisputeStatus {
  const adapterAddress =
    input.marketDisputeAdapter && input.marketDisputeAdapter !== zeroAddress
      ? input.marketDisputeAdapter
      : null;
  const usesReineira = Boolean(adapterAddress) || (input.escrowRegistered && input.escrowId !== null);

  const needsActivation =
    input.escrowRegistered &&
    !input.escrowActivated &&
    !input.escrowSettled &&
    !input.disputeOpened;

  const needsSettlement =
    input.marketState === MARKET_STATE_FINALIZED &&
    usesReineira &&
    input.escrowId !== null &&
    input.escrowRegistered &&
    input.escrowActivated &&
    !input.escrowSettled;

  return {
    usesReineira,
    adapterAddress,
    escrowId: input.escrowId,
    escrowRegistered: input.escrowRegistered,
    escrowActivated: input.escrowActivated,
    escrowSettled: input.escrowSettled,
    needsActivation,
    needsSettlement,
    disputeRefundsEnabled: input.disputeOpened ? input.disputeRefundsEnabled : null,
    marketState: input.marketState,
  };
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

type DisputeEscrowRecord = {
  registered: boolean;
  activated: boolean;
  settled: boolean;
  marketId: bigint;
};

async function adapterSupportsActivation(
  config: CipherMarketClientConfig,
  adapterAddress: Address,
): Promise<boolean> {
  const bytecode = await config.publicClient.getBytecode({ address: adapterAddress });
  return bytecode?.includes(ACTIVATE_DISPUTE_SELECTOR.slice(2)) ?? false;
}

async function readDisputeEscrow(
  config: CipherMarketClientConfig,
  adapterAddress: Address,
  escrowId: bigint,
  disputeOpened: boolean,
): Promise<DisputeEscrowRecord | null> {
  const supportsActivation = await adapterSupportsActivation(config, adapterAddress);

  if (supportsActivation) {
    const record = await config.publicClient.readContract({
      address: adapterAddress,
      abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
      functionName: 'disputeEscrows',
      args: [escrowId],
    }) as readonly [boolean, boolean, boolean, bigint, Address, Address, bigint, number];

    if (!record[0]) {
      return null;
    }

    return {
      registered: record[0],
      activated: record[1],
      settled: record[2],
      marketId: record[3],
    };
  }

  const legacyRecord = await config.publicClient.readContract({
    address: adapterAddress,
    abi: LEGACY_DISPUTE_ESCROW_ABI,
    functionName: 'disputeEscrows',
    args: [escrowId],
  }) as readonly [boolean, boolean, bigint, Address, Address, bigint, number];

  if (!legacyRecord[0]) {
    return null;
  }

  return {
    registered: legacyRecord[0],
    activated: disputeOpened,
    settled: legacyRecord[1],
    marketId: legacyRecord[2],
  };
}

async function resolveEscrowIdForMarket(
  config: CipherMarketClientConfig,
  adapterAddress: Address,
  marketId: bigint,
  disputeOpened: boolean,
): Promise<{ escrowId: bigint | null; record: DisputeEscrowRecord | null }> {
  const mappedEscrowId = await config.publicClient.readContract({
    address: adapterAddress,
    abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
    functionName: 'marketEscrowId',
    args: [marketId],
  }) as bigint;

  if (mappedEscrowId > 0n) {
    const record = await readDisputeEscrow(config, adapterAddress, mappedEscrowId, disputeOpened);
    return { escrowId: mappedEscrowId, record };
  }

  if (disputeOpened) {
    return { escrowId: null, record: null };
  }

  const supportsActivation = await adapterSupportsActivation(config, adapterAddress);
  if (!supportsActivation) {
    return { escrowId: null, record: null };
  }

  const logs = await config.publicClient.getLogs({
    address: adapterAddress,
    event: {
      type: 'event',
      name: 'EscrowRegistered',
      inputs: [
        { name: 'marketId', type: 'uint256', indexed: true },
        { name: 'escrowId', type: 'uint256', indexed: true },
        { name: 'disputer', type: 'address', indexed: true },
        { name: 'counterOutcome', type: 'uint8', indexed: false },
        { name: 'stakeAmount', type: 'uint256', indexed: false },
      ],
    },
    args: { marketId },
    fromBlock: 0n,
    toBlock: 'latest',
  });

  for (const log of logs.reverse()) {
    const escrowId = log.args.escrowId;
    if (escrowId === undefined) {
      continue;
    }

    const record = await readDisputeEscrow(config, adapterAddress, escrowId, disputeOpened);
    if (record?.registered && !record.activated && !record.settled) {
      return { escrowId, record };
    }
  }

  return { escrowId: null, record: null };
}

export async function getReineiraDisputeStatus(
  config: CipherMarketClientConfig,
  marketId: number | bigint,
): Promise<ReineiraDisputeStatus> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const marketIdBigInt = BigInt(marketId);

  const [marketView, marketDisputeAdapter] = await Promise.all([
    getMarket(config.publicClient, predictionMarketAddress, marketIdBigInt),
    config.publicClient.readContract({
      address: predictionMarketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'marketDisputeAdapter',
      args: [marketIdBigInt],
    }) as Promise<Address>,
  ]);

  const adapterAddress =
    marketDisputeAdapter && marketDisputeAdapter !== zeroAddress
      ? marketDisputeAdapter
      : config.addresses.reineiraDisputeEscrowAdapter;

  if (!adapterAddress || adapterAddress === zeroAddress) {
    return deriveReineiraDisputeStatus({
      marketState: marketView.state,
      disputeOpened: marketView.disputeOpened,
      disputeRefundsEnabled: marketView.disputeRefundsEnabled,
      marketDisputeAdapter: null,
      escrowId: null,
      escrowRegistered: false,
      escrowActivated: false,
      escrowSettled: false,
    });
  }

  const { escrowId, record } = await resolveEscrowIdForMarket(
    config,
    adapterAddress,
    marketIdBigInt,
    marketView.disputeOpened,
  );

  return deriveReineiraDisputeStatus({
    marketState: marketView.state,
    disputeOpened: marketView.disputeOpened,
    disputeRefundsEnabled: marketView.disputeRefundsEnabled,
    marketDisputeAdapter:
      marketDisputeAdapter && marketDisputeAdapter !== zeroAddress ? marketDisputeAdapter : null,
    escrowId,
    escrowRegistered: record?.registered ?? false,
    escrowActivated: record?.activated ?? marketView.disputeOpened,
    escrowSettled: record?.settled ?? false,
  });
}

export async function activateReineiraDispute(
  config: CipherMarketClientConfig,
  params: { marketId: number | bigint; escrowId: bigint; adapterAddress?: Address },
): Promise<Hex> {
  const status = await getReineiraDisputeStatus(config, params.marketId);
  const adapterAddress =
    params.adapterAddress ??
    status.adapterAddress ??
    config.addresses.reineiraDisputeEscrowAdapter;

  if (!adapterAddress || adapterAddress === zeroAddress) {
    throw new Error('Reineira dispute escrow adapter is not configured for this market.');
  }

  return writeContract(config, {
    address: adapterAddress,
    abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
    functionName: 'activateDispute',
    args: [params.escrowId],
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });
}

export async function settleReineiraDispute(
  config: CipherMarketClientConfig,
  params: { marketId: number | bigint },
): Promise<Hex> {
  const status = await getReineiraDisputeStatus(config, params.marketId);

  if (!status.needsSettlement || status.escrowId === null) {
    throw new Error('This market does not have a Reineira dispute escrow awaiting settlement.');
  }

  const adapterAddress = status.adapterAddress;
  if (!adapterAddress || adapterAddress === zeroAddress) {
    throw new Error('Reineira dispute escrow adapter could not be resolved for this market.');
  }

  return writeContract(config, {
    address: adapterAddress,
    abi: REINEIRA_DISPUTE_ESCROW_ADAPTER_ABI,
    functionName: 'settleEscrow',
    args: [status.escrowId],
    ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
  });
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
): Promise<{ createHash: Hex; fundHash: Hex; activateHash: Hex; escrowId: bigint }> {
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

  let fundHash: Hex;
  try {
    fundHash = await writeContract(config, {
      address: reineiraEscrowAddress,
      abi: REINEIRA_ESCROW_ABI,
      functionName: 'fund',
      args: [escrowId, toReineiraEncryptedInput(encryptedPayment)],
      ...(config.getGasFees ? await config.getGasFees() : await getBufferedGasFees(config.publicClient)),
    });
    const fundReceipt = await config.publicClient.waitForTransactionReceipt({ hash: fundHash });
    if (fundReceipt.status !== 'success') {
      throw new Error('Reineira escrow funding reverted on-chain.');
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Reineira escrow funding failed.';
    throw new Error(
      `${message} The market dispute was not opened. You can retry funding escrow ${escrowId.toString()} and then activate the dispute.`,
    );
  }

  let activateHash: Hex;
  try {
    activateHash = await activateReineiraDispute(config, {
      marketId: params.marketId,
      escrowId,
      adapterAddress,
    });
    const activateReceipt = await config.publicClient.waitForTransactionReceipt({ hash: activateHash });
    if (activateReceipt.status !== 'success') {
      throw new Error('Reineira dispute activation reverted on-chain.');
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Reineira dispute activation failed.';
    throw new Error(
      `${message} Escrow ${escrowId.toString()} is funded but the market dispute is not active yet. Retry activation when ready.`,
    );
  }

  return { createHash, fundHash, activateHash, escrowId };
}
