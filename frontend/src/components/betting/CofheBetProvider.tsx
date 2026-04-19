'use client';

import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CofheProvider } from '@cofhe/react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { cofheConfig } from '@/lib/fhenix';

export interface CofheBetProviderProps {
  children: ReactNode;
}

export default function CofheBetProvider({
  children,
}: CofheBetProviderProps): JSX.Element {
  const queryClient = useQueryClient();
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
