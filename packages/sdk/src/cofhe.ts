import type { Hex, PublicClient, WalletClient, Address } from 'viem';
import type { Permit } from '@cofhe/sdk/permits';
import type { CofheClientLike } from './types';

export const ZERO_CT_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

const DEFAULT_PERMIT_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const PERMIT_EXPIRY_SKEW_SECONDS = 60;

export function normalizeCtHash(value: unknown): Hex {
  if (typeof value === 'bigint') {
    return `0x${value.toString(16).padStart(64, '0')}` as Hex;
  }

  if (typeof value === 'string' && value.startsWith('0x')) {
    return value as Hex;
  }

  return ZERO_CT_HASH;
}

export function isZeroCtHash(value: unknown): boolean {
  return normalizeCtHash(value) === ZERO_CT_HASH;
}

export async function ensureCofheConnected(
  client: CofheClientLike | undefined,
  publicClient: PublicClient | undefined,
  walletClient: WalletClient | undefined,
): Promise<CofheClientLike> {
  if (!client) {
    throw new Error('CoFHE client is not available.');
  }

  if (!publicClient || !walletClient) {
    throw new Error('Connect your wallet before revealing encrypted values.');
  }

  if (!client.connected) {
    await client.connect(publicClient, walletClient);
  }

  return client;
}

function getNextPermitExpiration(): number {
  return Math.floor(Date.now() / 1000) + DEFAULT_PERMIT_LIFETIME_SECONDS;
}

function isPermitExpired(permit: Permit | undefined): permit is Permit {
  if (!permit) {
    return false;
  }

  return permit.expiration <= Math.floor(Date.now() / 1000) + PERMIT_EXPIRY_SKEW_SECONDS;
}

async function dropExpiredActivePermit(
  client: CofheClientLike,
  chainId: number,
  account: string,
): Promise<void> {
  const activePermit = client.permits.getActivePermit(chainId, account);
  if (!isPermitExpired(activePermit)) {
    return;
  }

  await client.permits.removePermit(activePermit.hash, chainId, account);
}

export async function getFreshSelfPermit(
  client: CofheClientLike,
  chainId: number,
  account: string,
  name: string,
): Promise<Permit> {
  await dropExpiredActivePermit(client, chainId, account);

  return client.permits.getOrCreateSelfPermit(chainId, account, {
    issuer: account,
    name,
    expiration: getNextPermitExpiration(),
  });
}

export async function withFreshSelfPermit<T>(
  client: CofheClientLike,
  chainId: number,
  account: string,
  name: string,
  task: (permit: Permit) => Promise<T>,
): Promise<T> {
  let permit = await getFreshSelfPermit(client, chainId, account, name);

  try {
    return await task(permit);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (!message.includes('permit expired')) {
      throw error;
    }

    await client.permits.removePermit(permit.hash, chainId, account);
    permit = await getFreshSelfPermit(client, chainId, account, name);
    return task(permit);
  }
}

export async function decryptForTx(
  client: CofheClientLike,
  chainId: number,
  account: Address,
  ctHash: Hex,
  permitName: string,
): Promise<{ decryptedValue: bigint; signature: Hex }> {
  const permit = await getFreshSelfPermit(client, chainId, account, permitName);
  const result = await client
    .decryptForTx(ctHash)
    .setAccount(account)
    .setChainId(chainId)
    .withPermit(permit)
    .execute();

  return {
    decryptedValue: BigInt(result.decryptedValue),
    signature: result.signature,
  };
}
