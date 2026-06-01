'use client';

import {
  getFreshSelfPermit as getSdkFreshSelfPermit,
  withFreshSelfPermit as withSdkFreshSelfPermit,
} from '@ciphermarket/sdk';
import type { Permit } from '@cofhe/sdk/permits';

export function getFreshSelfPermit(
  client: unknown,
  chainId: number,
  account: string,
  name: string,
): Promise<Permit> {
  return getSdkFreshSelfPermit(client as never, chainId, account, name);
}

export function withFreshSelfPermit<T>(
  client: unknown,
  chainId: number,
  account: string,
  name: string,
  task: (permit: Permit) => Promise<T>,
): Promise<T> {
  return withSdkFreshSelfPermit(client as never, chainId, account, name, task);
}
