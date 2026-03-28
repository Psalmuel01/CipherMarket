'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CofheProvider } from '@cofhe/react';
import { createConfig, http, WagmiProvider, usePublicClient, useWalletClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { cofheConfig, wagmiChains } from '@/lib/fhenix';

const wagmiConfig = createConfig({
  chains: wagmiChains,
  connectors: [injected()],
  transports: {
    [wagmiChains[0].id]: http(wagmiChains[0].rpcUrls.default.http[0]),
    [wagmiChains[1].id]: http(wagmiChains[1].rpcUrls.default.http[0]),
  },
  ssr: true,
});

const queryClient = new QueryClient();

interface ProvidersProps {
  children: ReactNode;
}

function CofheBridge({ children }: ProvidersProps): JSX.Element {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return (
    <CofheProvider
      config={cofheConfig}
      publicClient={publicClient}
      walletClient={walletClient}
      queryClient={queryClient}
    >
      {children}
    </CofheProvider>
  );
}

export default function Providers({ children }: ProvidersProps): JSX.Element {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <CofheBridge>{children}</CofheBridge>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

