import type { Bot } from 'grammy';
import { marketLink } from './links.js';
import type { createProtocolClient } from './ciphermarket.js';
import type { WatchStore } from './watchStore.js';

type ProtocolClient = ReturnType<typeof createProtocolClient>;

function alertText(status: string): string {
  switch (status) {
    case 'EXPIRED':
      return 'Trading closed. The market is awaiting oracle resolution.';
    case 'RESOLUTION_OPEN':
      return 'Resolution is open. A proposed outcome can be disputed during the window.';
    case 'FINALIZED':
      return 'Market finalized. Open the app to reveal positions and redeem winning shares.';
    case 'ESCALATED':
      return 'Market escalated for admin review.';
    default:
      return `Market status changed to ${status}.`;
  }
}

export function startAlertWorker(options: {
  bot: Bot;
  client: ProtocolClient;
  store: WatchStore;
  appUrl: string;
  intervalMs: number;
}): NodeJS.Timeout {
  const poll = async (): Promise<void> => {
    const watches = await options.store.listAll();
    if (watches.length === 0) return;

    const markets = await options.client.markets.list();
    const marketById = new Map(markets.map((market) => [market.marketId, market]));

    await Promise.all(
      watches.map(async (watch) => {
        const market = marketById.get(watch.market_id);
        if (!market || market.status === watch.last_status) return;

        await options.store.updateStatus({
          telegram_user_id: watch.telegram_user_id,
          chat_id: watch.chat_id,
          market_id: watch.market_id,
          last_status: market.status,
        });

        await options.bot.api.sendMessage(
          watch.chat_id,
          `<b>#${market.marketId} ${market.title}</b>\n${alertText(market.status)}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Open Market',
                    url: marketLink(options.appUrl, market.marketId, { action: market.status === 'FINALIZED' ? 'redeem' : 'view' }),
                  },
                ],
              ],
            },
          },
        );
      }),
    );
  };

  void poll().catch((error) => console.error('Initial alert poll failed:', error));

  return setInterval(() => {
    void poll().catch((error) => console.error('Alert poll failed:', error));
  }, options.intervalMs);
}
