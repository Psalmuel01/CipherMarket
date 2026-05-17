import type { PublicClient, WalletClient } from 'viem';

interface ConnectableCofheClient {
  connected?: boolean;
  connecting?: boolean;
  connect: (publicClient: PublicClient, walletClient: WalletClient) => Promise<void>;
}

export async function ensureCofheConnected(
  client: ConnectableCofheClient,
  publicClient: PublicClient | undefined,
  walletClient: WalletClient | undefined,
): Promise<void> {
  if (!publicClient || !walletClient) {
    throw new Error('Connect your wallet before revealing encrypted values.');
  }

  if (client.connected) {
    return;
  }

  await client.connect(publicClient, walletClient);
}
