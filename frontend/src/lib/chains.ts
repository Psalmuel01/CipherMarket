import { defineChain, http } from 'viem';

export const cipherMarketSepolia = defineChain({
  id: 11155111,
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
});

export const wagmiChains = [cipherMarketSepolia] as const;

export const wagmiTransports = {
  [cipherMarketSepolia.id]: http(cipherMarketSepolia.rpcUrls.default.http[0]),
};
