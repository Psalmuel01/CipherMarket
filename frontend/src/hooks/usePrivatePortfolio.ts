'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCofheContext } from '@cofhe/react';
import { FheTypes } from '@cofhe/sdk';
import { useAccount, useChainId, usePublicClient, useReadContracts, useWalletClient } from 'wagmi';
import { ensureCofheConnected } from '@/lib/cofheClient';
import { withFreshSelfPermit } from '@/lib/cofhePermits';
import { getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { isZeroCtHash, normalizeCtHash } from '@/lib/fheHandles';
import type { MarketSummary } from '@/types/market';

export interface RevealedPortfolioPosition {
  marketId: number;
  outcomeIndex: number;
  shares: bigint;
  investedAmount: bigint;
}

export interface RevealedPortfolioRealization {
  marketId: number;
  redeemedPayout: bigint;
  realizedInvestmentBasis: bigint;
}

export interface UsePrivatePortfolioResult {
  data: RevealedPortfolioPosition[];
  realized: RevealedPortfolioRealization[];
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
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
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

  const investedContracts = useMemo(
    () =>
      predictionMarketAddress && address
        ? markets.flatMap((market) =>
            market.outcomes.map((outcome) => ({
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'totalInvestedPerOutcome',
              args: [BigInt(market.marketId), address, outcome.outcomeIndex],
            })),
          )
        : [],
    [address, markets, predictionMarketAddress],
  );

  const realizedContracts = useMemo(
    () =>
      predictionMarketAddress && address
        ? markets.flatMap((market) => [
            {
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'realizedRedeemedPayout',
              args: [BigInt(market.marketId), address],
            },
            {
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'realizedInvestmentBasis',
              args: [BigInt(market.marketId), address],
            },
          ])
        : [],
    [address, markets, predictionMarketAddress],
  );

  const handlesQuery = useReadContracts({
    contracts: handleContracts,
    query: {
      enabled: Boolean(predictionMarketAddress) && Boolean(address) && handleContracts.length > 0,
    },
  });

  const investedQuery = useReadContracts({
    contracts: investedContracts,
    query: {
      enabled: Boolean(predictionMarketAddress) && Boolean(address) && investedContracts.length > 0,
    },
  });

  const realizedQuery = useReadContracts({
    contracts: realizedContracts,
    query: {
      enabled: Boolean(predictionMarketAddress) && Boolean(address) && realizedContracts.length > 0,
    },
  });

  const realized = useMemo<RevealedPortfolioRealization[]>(() => {
    const items = realizedQuery.data ?? [];

    return markets
      .map((market, index) => {
        const payoutResult = items[index * 2];
        const basisResult = items[index * 2 + 1];
        const redeemedPayout =
          payoutResult?.status === 'success' && typeof payoutResult.result === 'bigint'
            ? payoutResult.result
            : 0n;
        const realizedInvestmentBasis =
          basisResult?.status === 'success' && typeof basisResult.result === 'bigint'
            ? basisResult.result
            : 0n;

        return {
          marketId: market.marketId,
          redeemedPayout,
          realizedInvestmentBasis,
        };
      })
      .filter((item) => item.redeemedPayout > 0n || item.realizedInvestmentBasis > 0n);
  }, [markets, realizedQuery.data]);

  const revealedQuery = useQuery({
    queryKey: [
      'private-portfolio',
      chainId,
      address,
      markets.map((m) => m.marketId),
      handlesQuery.data?.map((r) => (r.status === 'success' ? String(r.result) : r.status)),
      investedQuery.data?.map((r) => (r.status === 'success' ? String(r.result) : r.status)),
    ],
    enabled:
      enabled &&
      Boolean(client) &&
      Boolean(chainId) &&
      Boolean(address) &&
      Boolean(publicClient) &&
      Boolean(walletClient) &&
      Boolean(predictionMarketAddress) &&
      Boolean(handlesQuery.data?.length) &&
      Boolean(investedQuery.data?.length),
    queryFn: async () => {
      if (!address || !chainId || !publicClient || !walletClient || !predictionMarketAddress) {
        return [];
      }

      try {
        await ensureCofheConnected(client, publicClient, walletClient);

        return withFreshSelfPermit(
          client,
          chainId,
          address,
          'CipherMarket portfolio view',
          async (permit) => {
            const positions: RevealedPortfolioPosition[] = [];
            let cursor = 0;

            for (const market of markets) {
              for (const outcome of market.outcomes) {
                const handleResult = handlesQuery.data?.[cursor];
                const investedResult = investedQuery.data?.[cursor];
                cursor += 1;
                const investedAmount =
                  investedResult?.status === 'success' && typeof investedResult.result === 'bigint'
                    ? investedResult.result
                    : 0n;

                const handle =
                  handleResult?.status === 'success'
                    ? normalizeCtHash(handleResult.result)
                    : normalizeCtHash(null);

                if (isZeroCtHash(handle)) {
                  if (investedAmount > 0n) {
                    positions.push({
                      marketId: market.marketId,
                      outcomeIndex: outcome.outcomeIndex,
                      shares: 0n,
                      investedAmount,
                    });
                  }
                  continue;
                }

                const unsealed = await client
                  .decryptForView(handle, FheTypes.Uint128)
                  .setAccount(address)
                  .setChainId(chainId)
                  .withPermit(permit)
                  .execute();

                const shares = BigInt(unsealed);
                if (shares > 0n || investedAmount > 0n) {
                  positions.push({
                    marketId: market.marketId,
                    outcomeIndex: outcome.outcomeIndex,
                    shares,
                    investedAmount,
                  });
                }
              }
            }

            return positions;
          },
        );
      } catch (decryptError) {
        console.error('CipherMarket portfolio decrypt failed:', decryptError);
        throw decryptError;
      }
    },
    staleTime: 30_000,
  });

  return {
    data: revealedQuery.data ?? [],
    realized,
    isLoading: handlesQuery.isLoading || investedQuery.isLoading || realizedQuery.isLoading || revealedQuery.isLoading,
    isError: Boolean(handlesQuery.error || investedQuery.error || realizedQuery.error || revealedQuery.error),
    error: (handlesQuery.error || investedQuery.error || realizedQuery.error || revealedQuery.error) as Error | null,
  };
}
