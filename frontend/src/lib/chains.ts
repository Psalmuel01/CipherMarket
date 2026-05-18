import { defineChain, http } from 'viem';

export const arbitrumSepolia = defineChain({
  id: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: { name: 'Arbitrum Sepolia ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || 'https://arbitrum-sepolia.infura.io/v3/d8bc683c0b7841b18d5976c3dedf25c6',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  },
});

export const wagmiChains = [arbitrumSepolia] as const;

export const wagmiTransports = {
  [arbitrumSepolia.id]: http(arbitrumSepolia.rpcUrls.default.http[0]),
};
