'use client';

import type { Permit } from '@cofhe/sdk/permits';

const DEFAULT_PERMIT_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const PERMIT_EXPIRY_SKEW_SECONDS = 60;

interface SelfPermitClient {
  permits: {
    getActivePermit: (chainId?: number, account?: string) => Permit | undefined;
    getOrCreateSelfPermit: (
      chainId?: number,
      account?: string,
      options?: {
        issuer: string;
        name: string;
        expiration?: number;
      },
    ) => Promise<Permit>;
    removePermit: (hash: string, chainId?: number, account?: string) => void | Promise<void>;
  };
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
  client: SelfPermitClient,
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
  client: SelfPermitClient,
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
  client: SelfPermitClient,
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
