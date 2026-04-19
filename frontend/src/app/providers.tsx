'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, injected } from 'wagmi';
import { wagmiChains, wagmiTransports } from '@/lib/chains';

const wagmiConfig = createConfig({
  chains: wagmiChains,
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: wagmiTransports,
  ssr: true,
});

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps): JSX.Element {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
