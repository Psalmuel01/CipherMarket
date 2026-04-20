'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCofheContext } from '@cofhe/react';
import { FheTypes } from '@cofhe/sdk';
import { useAccount, useChainId, useReadContracts } from 'wagmi';
import { getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import type { MarketSummary } from '@/types/market';

export interface RevealedPortfolioPosition {
  marketId: number;
  outcomeIndex: number;
  shares: bigint;
}

export interface UsePrivatePortfolioResult {
  data: RevealedPortfolioPosition[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Reveals the connected wallet's non-zero positions across the supplied markets.
 */
export default function usePrivatePortfolio(
  markets: MarketSummary[],
  enabled: boolean,
): UsePrivatePortfolioResult {
  const chainId = useChainId();
  const { address } = useAccount();
  const { client } = useCofheContext();
  const addresses = getContractAddresses(chainId);
  const predictionMarketAddress = addresses?.predictionMarket;

  const handleContracts = useMemo(
    () =>
      predictionMarketAddress && address
        ? markets.flatMap((market) =>
            market.outcomes.map((outcome) => ({
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getEncryptedUserPositionHandle',
              args: [BigInt(market.marketId), address, outcome.outcomeIndex],
            })),
          )
        : [],
    [address, markets, predictionMarketAddress],
  );

  const handlesQuery = useReadContracts({
    contracts: handleContracts,
    query: {
      enabled: Boolean(predictionMarketAddress) && Boolean(address) && handleContracts.length > 0,
    },
  });

  const revealedQuery = useQuery({
    queryKey: ['private-portfolio', chainId, address, markets, handlesQuery.data],
    enabled:
      enabled &&
      Boolean(client) &&
      Boolean(address) &&
      Boolean(predictionMarketAddress) &&
      Boolean(handlesQuery.data?.length),
    queryFn: async () => {
      if (!address || !predictionMarketAddress) {
        return [];
      }

      await client.permits.getOrCreateSelfPermit(chainId, address, {
        issuer: predictionMarketAddress,
        name: 'CipherMarket portfolio view',
      });

      const positions: RevealedPortfolioPosition[] = [];
      let cursor = 0;

      for (const market of markets) {
        for (const outcome of market.outcomes) {
          const handleResult = handlesQuery.data?.[cursor];
          cursor += 1;

          const handle =
            handleResult?.status === 'success' && typeof handleResult.result === 'bigint'
              ? handleResult.result
              : 0n;

          if (handle === 0n) {
            continue;
          }

          const unsealed = await client
            .decryptForView(handle, FheTypes.Uint128)
            .setAccount(address)
            .setChainId(chainId ?? 11155111)
            .withPermit()
            .execute();

          const shares = BigInt(unsealed);
          if (shares > 0n) {
            positions.push({
              marketId: market.marketId,
              outcomeIndex: outcome.outcomeIndex,
              shares,
            });
          }
        }
      }

      return positions;
    },
    staleTime: 30_000,
  });

  return {
    data: revealedQuery.data ?? [],
    isLoading: handlesQuery.isLoading || revealedQuery.isLoading,
    isError: Boolean(handlesQuery.error || revealedQuery.error),
    error: (handlesQuery.error || revealedQuery.error) as Error | null,
  };
}
