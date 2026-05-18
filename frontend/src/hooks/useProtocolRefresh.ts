'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function useProtocolRefresh(): () => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries();
    await queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);
}
