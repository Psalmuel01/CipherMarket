export type MarketAction = 'buy' | 'sell' | 'redeem' | 'view';

export function marketLink(
  appUrl: string,
  marketId: number | bigint,
  options: {
    action?: MarketAction;
    outcomeIndex?: number;
  } = {},
): string {
  const url = new URL(`/markets/${marketId.toString()}`, appUrl);
  if (options.action && options.action !== 'view') {
    url.searchParams.set('action', options.action);
  }
  if (options.outcomeIndex !== undefined) {
    url.searchParams.set('outcome', String(options.outcomeIndex));
  }
  return url.toString();
}
