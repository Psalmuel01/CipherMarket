import { formatTokenAmount, type MarketSummary, type QuotePreview } from '@ciphermarket/sdk';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function marketListMessage(markets: MarketSummary[]): string {
  if (markets.length === 0) {
    return 'No markets are available yet.';
  }

  const rows = markets.slice(0, 10).map((market) => {
    const odds = market.outcomes
      .slice(0, 2)
      .map((outcome) => `${escapeHtml(outcome.label)} ${outcome.impliedShare}%`)
      .join(' / ');
    return `#${market.marketId} <b>${escapeHtml(market.title)}</b>\n${market.status} · ${market.collateralSymbol} · ${odds}`;
  });

  return `<b>CipherMarket Markets</b>\n\n${rows.join('\n\n')}`;
}

export function marketDetailMessage(market: MarketSummary): string {
  const outcomes = market.outcomes
    .map((outcome) => {
      const reserve = formatTokenAmount(outcome.reserve, market.collateralSymbol === 'USDC' ? 6 : 18, market.collateralSymbol);
      return `${outcome.outcomeIndex}: ${escapeHtml(outcome.label)} · ${outcome.impliedShare}% · ${reserve}`;
    })
    .join('\n');

  return [
    `<b>#${market.marketId} ${escapeHtml(market.title)}</b>`,
    escapeHtml(market.description),
    '',
    `Status: <b>${market.status}</b>`,
    `Collateral: ${market.collateralSymbol}`,
    `Liquidity: ${formatTokenAmount(market.totalLiquidity, market.collateralSymbol === 'USDC' ? 6 : 18, market.collateralSymbol)}`,
    `Volume: ${formatTokenAmount(market.tradeVolume, market.collateralSymbol === 'USDC' ? 6 : 18, market.collateralSymbol)}`,
    '',
    outcomes,
  ].join('\n');
}

export function quoteMessage(
  market: MarketSummary,
  quote: QuotePreview,
  outcomeLabel: string,
): string {
  const decimals = market.collateralSymbol === 'USDC' ? 6 : 18;
  return [
    `<b>Quote for #${market.marketId}</b>`,
    `${escapeHtml(outcomeLabel)} · ${quote.side}`,
    '',
    `Input: ${formatTokenAmount(quote.collateralAmount, decimals, market.collateralSymbol)}`,
    `Estimated shares: ${formatTokenAmount(quote.sharesAmount, decimals, 'shares')}`,
    `Fee: ${formatTokenAmount(quote.feeAmount, decimals, market.collateralSymbol)}`,
    `Average price: ${formatTokenAmount(quote.averagePrice, 18, market.collateralSymbol)}`,
  ].join('\n');
}
