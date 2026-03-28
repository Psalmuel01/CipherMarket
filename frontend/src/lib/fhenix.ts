import { createCofheConfig } from '@cofhe/react';
import {
  localcofhe as cofheLocalcofhe,
  sepolia as cofheSepolia,
} from '@cofhe/sdk/chains';
import { defineChain, http } from 'viem';

export const localcofhe = defineChain({
  id: 420105,
  name: 'Local Cofhe',
  nativeCurrency: { name: 'Local ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'Localhost', url: 'http://127.0.0.1:8545' },
  },
});

export const cipherMarketSepolia = defineChain({
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://ethereum-sepolia.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
});

export const wagmiChains = [localcofhe, cipherMarketSepolia] as const;

export const wagmiTransports = {
  [localcofhe.id]: http(localcofhe.rpcUrls.default.http[0]),
  [cipherMarketSepolia.id]: http(cipherMarketSepolia.rpcUrls.default.http[0]),
};

export const cofheConfig = createCofheConfig({
  supportedChains: [cofheLocalcofhe, cofheSepolia],
  useWorkers: true,
  mocks: {
    decryptDelay: 0,
    encryptDelay: [80, 80, 120, 240, 240],
  },
  react: {
    autogeneratePermits: false,
    enableShieldUnshield: false,
    initialTheme: 'dark',
    position: 'bottom-right',
    shareablePermits: false,
  },
});
