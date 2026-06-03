import { requirePredictionMarketAddress } from './addresses.js';
import { listMarkets, getMarket, getPoolReserves } from './markets.js';
import { quoteTrade } from './quotes.js';
import { buyShares, sellShares } from './trading.js';
import { revealPositions, getInvestedAmounts, getRealizedPortfolio, getRedeemable } from './portfolio.js';
import { redeemWinningShares } from './redemption.js';
import { openDirectDispute, openReineiraDispute, activateReineiraDispute, settleReineiraDispute, getReineiraDisputeStatus } from './disputes.js';
import type { CipherMarketClientConfig } from './types.js';

export function createCipherMarketClient(config: CipherMarketClientConfig) {
  const predictionMarketAddress = () => requirePredictionMarketAddress(config.addresses);

  return {
    config,
    markets: {
      list: () => listMarkets(config.publicClient, predictionMarketAddress(), config.addresses),
      get: (marketId: number | bigint) => getMarket(config.publicClient, predictionMarketAddress(), marketId),
      getPools: async (marketId: number | bigint, outcomeCount: number) =>
        getPoolReserves(config.publicClient, predictionMarketAddress(), BigInt(marketId), outcomeCount),
    },
    quotes: {
      buy: (params: { marketId: number | bigint; outcomeIndex: number; amount: bigint }) =>
        quoteTrade(config.publicClient, predictionMarketAddress(), { ...params, side: 'BUY' }),
      sell: (params: { marketId: number | bigint; outcomeIndex: number; amount: bigint }) =>
        quoteTrade(config.publicClient, predictionMarketAddress(), { ...params, side: 'SELL' }),
    },
    trading: {
      buyShares: (params: Parameters<typeof buyShares>[1]) => buyShares(config, params),
      sellShares: (params: Parameters<typeof sellShares>[1]) => sellShares(config, params),
    },
    portfolio: {
      revealPositions: (markets: Parameters<typeof revealPositions>[1], account: Parameters<typeof revealPositions>[2]) =>
        revealPositions(config, markets, account),
      getInvestedAmounts: (params: Parameters<typeof getInvestedAmounts>[1]) => getInvestedAmounts(config, params),
      getRealized: (markets: Parameters<typeof getRealizedPortfolio>[1], account: Parameters<typeof getRealizedPortfolio>[2]) =>
        getRealizedPortfolio(config, markets, account),
      getRedeemable,
    },
    redemption: {
      redeemWinningShares: (params: Parameters<typeof redeemWinningShares>[1]) =>
        redeemWinningShares(config, params),
    },
    disputes: {
      openDirect: (params: Parameters<typeof openDirectDispute>[1]) => openDirectDispute(config, params),
      openWithReineira: (params: Parameters<typeof openReineiraDispute>[1]) =>
        openReineiraDispute(config, params),
      activateReineira: (params: Parameters<typeof activateReineiraDispute>[1]) =>
        activateReineiraDispute(config, params),
      settleReineira: (params: Parameters<typeof settleReineiraDispute>[1]) =>
        settleReineiraDispute(config, params),
      getReineiraStatus: (marketId: number | bigint) => getReineiraDisputeStatus(config, marketId),
    },
  };
}

export type CipherMarketClient = ReturnType<typeof createCipherMarketClient>;
