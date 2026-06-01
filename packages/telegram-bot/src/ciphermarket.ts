import { createCipherMarketClient } from '@ciphermarket/sdk';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import type { BotConfig } from './config.js';

export function createProtocolClient(config: BotConfig) {
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(config.rpcUrl),
  });

  return createCipherMarketClient({
    chainId: config.chainId,
    publicClient,
    addresses: config.addresses,
  });
}
