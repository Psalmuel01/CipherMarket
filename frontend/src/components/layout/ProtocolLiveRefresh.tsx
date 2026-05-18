'use client';

import { useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import usePendingTransactions from '@/hooks/usePendingTransactions';
import useProtocolRefresh from '@/hooks/useProtocolRefresh';

export default function ProtocolLiveRefresh(): null {
  const publicClient = usePublicClient();
  const refreshProtocolData = useProtocolRefresh();
  const { hasPending } = usePendingTransactions();

  useEffect(() => {
    if (!publicClient || !hasPending) {
      return;
    }

    let lastBlock: bigint | null = null;

    return publicClient.watchBlockNumber({
      emitOnBegin: true,
      onBlockNumber: (blockNumber) => {
        if (lastBlock === blockNumber) {
          return;
        }

        lastBlock = blockNumber;
        void refreshProtocolData();
      },
    });
  }, [hasPending, publicClient, refreshProtocolData]);

  return null;
}
