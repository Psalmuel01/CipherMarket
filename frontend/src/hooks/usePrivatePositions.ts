'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCofheContext } from '@cofhe/react';
import { FheTypes } from '@cofhe/sdk';
import { useAccount, useChainId, useReadContracts } from 'wagmi';
import { withFreshSelfPermit } from '@/lib/cofhePermits';
import { getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';

export interface UsePrivatePositionsResult {
  data: bigint[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Reveals the connected account's encrypted per-outcome balances for a single market.
 * Values stay hidden until `enabled` is true, at which point a self-permit is created and used
 * to decrypt the stored ciphertext handles locally.
 */
export default function usePrivatePositions(
  marketId: number,
  outcomeCount: number,
  enabled: boolean,
): UsePrivatePositionsResult {
  const chainId = useChainId();
  const { address } = useAccount();
  const { client } = useCofheContext();
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket;

  const outcomeIndexes = useMemo(
    () => Array.from({ length: outcomeCount }, (_, index) => index),
    [outcomeCount],
  );

  const handlesQuery = useReadContracts({
    contracts:
      predictionMarketAddress && address && outcomeIndexes.length > 0
        ? outcomeIndexes.map((outcomeIndex) => ({
          address: predictionMarketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'getEncryptedUserPositionHandle',
          args: [BigInt(marketId), address, outcomeIndex],
        }))
        : [],
    query: {
      enabled: Boolean(predictionMarketAddress) && Boolean(address) && outcomeIndexes.length > 0,
    },
  });

  const handleKeys = useMemo(() => {
    if (!handlesQuery.data) return [];
    return handlesQuery.data.map((r) =>
      r?.status === 'success' && typeof r.result === 'bigint'
        ? r.result.toString()
        : '0',
    );
  }, [handlesQuery.data]);

  const revealedQuery = useQuery({
    queryKey: ['private-positions', chainId, address, marketId, outcomeCount, handleKeys],
    enabled:
      enabled &&
      Boolean(client) &&
      Boolean(address) &&
      Boolean(predictionMarketAddress) &&
      Boolean(handlesQuery.data?.length),
    queryFn: async () => {
      if (!address || !predictionMarketAddress) {
        return outcomeIndexes.map(() => 0n);
      }

      try {
        const values = await withFreshSelfPermit(
          client,
          chainId ?? 11155111,
          address,
          `CipherMarket ${marketId} position view`,
          async (permit) =>
            Promise.all(
              outcomeIndexes.map(async (outcomeIndex) => {
                const result = handlesQuery.data?.[outcomeIndex];
                const handle =
                  result?.status === 'success' && typeof result.result === 'bigint'
                    ? result.result
                    : 0n;

                if (handle === 0n) {
                  return 0n;
                }

                const unsealed = await client
                  .decryptForView(handle, FheTypes.Uint128)
                  .setAccount(address)
                  .setChainId(chainId ?? 11155111)
                  .withPermit(permit)
                  .execute();

                return BigInt(unsealed);
              }),
            ),
        );

        return values;
      } catch (decryptError) {
        console.error('CipherMarket private position decrypt failed:', decryptError);
        throw decryptError;
      }
    },
    staleTime: 30_000,
  });

  return {
    data: revealedQuery.data ?? outcomeIndexes.map(() => 0n),
    isLoading: handlesQuery.isLoading || revealedQuery.isLoading,
    isError: Boolean(handlesQuery.error || revealedQuery.error),
    error: (handlesQuery.error || revealedQuery.error) as Error | null,
  };
}
