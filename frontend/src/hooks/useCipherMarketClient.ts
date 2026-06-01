'use client';

import { useMemo } from 'react';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { createCipherMarketClient } from '@ciphermarket/sdk';
import { getBufferedContractGas, getBufferedGasFees } from '@/lib/gas';
import { getContractAddresses } from '@/lib/contracts';
import { useCofheContext } from '@cofhe/react';

export default function useCipherMarketClient() {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { client: cofheClient } = useCofheContext();
  const addresses = getContractAddresses(chainId);

  return useMemo(() => {
    if (!publicClient || !addresses) {
      return null;
    }

    return createCipherMarketClient({
      chainId,
      publicClient,
      walletClient,
      cofheClient: cofheClient as never,
      account: address,
      addresses,
      getGasFees: () => getBufferedGasFees(publicClient),
      estimateGas: (request, fallbackGas) => getBufferedContractGas(publicClient, request, fallbackGas),
    });
  }, [address, addresses, chainId, cofheClient, publicClient, walletClient]);
}
