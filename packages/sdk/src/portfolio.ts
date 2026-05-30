import type { Address } from 'viem';
import { FheTypes } from '@cofhe/sdk';
import { PREDICTION_MARKET_ABI } from './abi';
import { ensureCofheConnected, isZeroCtHash, normalizeCtHash, withFreshSelfPermit } from './cofhe';
import { requirePredictionMarketAddress } from './addresses';
import type { CipherMarketClientConfig, MarketSummary } from './types';

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

export async function getInvestedAmounts(
  config: CipherMarketClientConfig,
  params: {
    marketId: number | bigint;
    account: Address;
    outcomeCount: number;
  },
): Promise<bigint[]> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const amounts: bigint[] = [];

  for (let outcomeIndex = 0; outcomeIndex < params.outcomeCount; outcomeIndex += 1) {
    const amount = await config.publicClient.readContract({
      address: predictionMarketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'totalInvestedPerOutcome',
      args: [BigInt(params.marketId), params.account, outcomeIndex],
    });
    amounts.push(typeof amount === 'bigint' ? amount : 0n);
  }

  return amounts;
}

export async function getRealizedPortfolio(
  config: CipherMarketClientConfig,
  markets: MarketSummary[],
  account: Address,
): Promise<RevealedPortfolioRealization[]> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const realized: RevealedPortfolioRealization[] = [];

  for (const market of markets) {
    const [redeemedPayout, realizedInvestmentBasis] = await Promise.all([
      config.publicClient.readContract({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'realizedRedeemedPayout',
        args: [BigInt(market.marketId), account],
      }),
      config.publicClient.readContract({
        address: predictionMarketAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'realizedInvestmentBasis',
        args: [BigInt(market.marketId), account],
      }),
    ]);

    const item = {
      marketId: market.marketId,
      redeemedPayout: typeof redeemedPayout === 'bigint' ? redeemedPayout : 0n,
      realizedInvestmentBasis:
        typeof realizedInvestmentBasis === 'bigint' ? realizedInvestmentBasis : 0n,
    };
    if (item.redeemedPayout > 0n || item.realizedInvestmentBasis > 0n) {
      realized.push(item);
    }
  }

  return realized;
}

export async function revealPositions(
  config: CipherMarketClientConfig,
  markets: MarketSummary[],
  account: Address,
): Promise<RevealedPortfolioPosition[]> {
  const predictionMarketAddress = requirePredictionMarketAddress(config.addresses);
  const cofheClient = await ensureCofheConnected(config.cofheClient, config.publicClient, config.walletClient);

  return withFreshSelfPermit(
    cofheClient,
    config.chainId,
    account,
    'CipherMarket portfolio view',
    async (permit) => {
      const positions: RevealedPortfolioPosition[] = [];

      for (const market of markets) {
        for (const outcome of market.outcomes) {
          const [handleResult, investedResult] = await Promise.all([
            config.publicClient.readContract({
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getEncryptedUserPositionHandle',
              args: [BigInt(market.marketId), account, outcome.outcomeIndex],
            }),
            config.publicClient.readContract({
              address: predictionMarketAddress,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'totalInvestedPerOutcome',
              args: [BigInt(market.marketId), account, outcome.outcomeIndex],
            }),
          ]);
          const investedAmount = typeof investedResult === 'bigint' ? investedResult : 0n;
          const handle = normalizeCtHash(handleResult);

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

          const unsealed = await cofheClient
            .decryptForView(handle, FheTypes.Uint128)
            .setAccount(account)
            .setChainId(config.chainId)
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
}

export function getRedeemable(
  markets: MarketSummary[],
  positions: RevealedPortfolioPosition[],
): Array<{ market: MarketSummary; winningShares: bigint }> {
  return markets
    .filter((market) => market.status === 'FINALIZED' && market.finalOutcomeIndex !== null)
    .map((market) => {
      const winningShares = positions
        .filter(
          (position) =>
            position.marketId === market.marketId &&
            position.outcomeIndex === market.finalOutcomeIndex,
        )
        .reduce((sum, position) => sum + position.shares, 0n);

      return { market, winningShares };
    })
    .filter((item) => item.winningShares > 0n);
}
