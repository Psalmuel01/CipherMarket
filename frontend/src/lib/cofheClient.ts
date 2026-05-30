import { ensureCofheConnected as ensureSdkCofheConnected } from '@ciphermarket/sdk';
import type { PublicClient, WalletClient } from 'viem';

export async function ensureCofheConnected(
  client: unknown,
  publicClient: PublicClient | undefined,
  walletClient: WalletClient | undefined,
): Promise<void> {
  await ensureSdkCofheConnected(client as never, publicClient, walletClient);
}
