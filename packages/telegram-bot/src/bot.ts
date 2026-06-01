import { Bot, InlineKeyboard } from 'grammy';
import { getAddress } from 'viem';
import type { BotConfig } from './config.js';
import { createProtocolClient } from './ciphermarket.js';
import { escapeHtml, marketDetailMessage, marketListMessage, quoteMessage } from './format.js';
import { marketLink } from './links.js';
import { parseMarketId, parseOutcomeIndex, parseTokenAmount } from './parsers.js';
import { createWatchStore, type WatchStore } from './watchStore.js';
import { startAlertWorker } from './alerts.js';

type ProtocolClient = ReturnType<typeof createProtocolClient>;

const HELP_TEXT = `<b>CipherMarket Signal Bot</b>

/markets - list active markets
/market &lt;id&gt; - details and odds
/quote &lt;id&gt; &lt;YES|NO|index&gt; &lt;amount&gt; - buy quote
/watch &lt;id&gt; - notify on market status changes
/unwatch &lt;id&gt; - stop notifications
/watchlist - list watched markets
/redeemable &lt;wallet&gt; - show finalized markets to check
/status - bot health

Signed actions open the CipherMarket app. The bot never holds private keys.`;

async function findMarket(client: ProtocolClient, marketId: number) {
  const markets = await client.markets.list();
  const market = markets.find((item) => item.marketId === marketId);
  if (!market) {
    throw new Error(`Market #${marketId} was not found.`);
  }
  return market;
}

function marketKeyboard(appUrl: string, marketId: number, outcomeCount: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard.url('Open App', marketLink(appUrl, marketId));
  keyboard.row();
  keyboard.url('Buy 0', marketLink(appUrl, marketId, { action: 'buy', outcomeIndex: 0 }));
  if (outcomeCount > 1) {
    keyboard.url('Buy 1', marketLink(appUrl, marketId, { action: 'buy', outcomeIndex: 1 }));
  }
  keyboard.row();
  keyboard.url('Sell', marketLink(appUrl, marketId, { action: 'sell' }));
  keyboard.url('Redeem', marketLink(appUrl, marketId, { action: 'redeem' }));
  return keyboard;
}

export function createCipherMarketBot(config: BotConfig): {
  bot: Bot;
  client: ProtocolClient;
  store: WatchStore;
  startAlerts: () => NodeJS.Timeout;
} {
  const bot = new Bot(config.telegramToken);
  const client = createProtocolClient(config);
  const store = createWatchStore({
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  });

  bot.command(['start', 'help'], async (ctx) => {
    await ctx.reply(HELP_TEXT, { parse_mode: 'HTML' });
  });

  bot.command('status', async (ctx) => {
    const markets = await client.markets.list();
    await ctx.reply(
      `Bot online.\nNetwork: Arbitrum Sepolia\nMarkets: ${markets.length}\nWatch storage: ${store.enabled ? 'Supabase' : 'memory'}`,
    );
  });

  bot.command('markets', async (ctx) => {
    const markets = await client.markets.list();
    await ctx.reply(marketListMessage(markets), { parse_mode: 'HTML' });
  });

  bot.command('market', async (ctx) => {
    const marketId = parseMarketId(ctx.match.toString().trim());
    const market = await findMarket(client, marketId);
    await ctx.reply(marketDetailMessage(market), {
      parse_mode: 'HTML',
      reply_markup: marketKeyboard(config.appUrl, market.marketId, market.outcomeCount),
    });
  });

  bot.command('quote', async (ctx) => {
    const [idArg, outcomeArg, amountArg] = ctx.match.toString().trim().split(/\s+/);
    const marketId = parseMarketId(idArg);
    const outcomeIndex = parseOutcomeIndex(outcomeArg);
    const market = await findMarket(client, marketId);
    const outcome = market.outcomes[outcomeIndex];
    if (!outcome) {
      throw new Error(`Outcome ${outcomeIndex} does not exist on market #${marketId}.`);
    }

    const decimals = market.collateralSymbol === 'USDC' ? 6 : 18;
    const amount = parseTokenAmount(amountArg, decimals);
    const quote = await client.quotes.buy({ marketId, outcomeIndex, amount });

    await ctx.reply(quoteMessage(market, quote, outcome.label), {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().url(
        'Buy in App',
        marketLink(config.appUrl, marketId, { action: 'buy', outcomeIndex }),
      ),
    });
  });

  bot.command('watch', async (ctx) => {
    if (!ctx.from) throw new Error('Telegram user unavailable.');
    const marketId = parseMarketId(ctx.match.toString().trim());
    const market = await findMarket(client, marketId);
    await store.add({
      telegram_user_id: ctx.from.id,
      chat_id: ctx.chat.id,
      market_id: market.marketId,
      last_status: market.status,
    });
    await ctx.reply(`Watching #${market.marketId}: ${market.title}`);
  });

  bot.command('unwatch', async (ctx) => {
    if (!ctx.from) throw new Error('Telegram user unavailable.');
    const marketId = parseMarketId(ctx.match.toString().trim());
    await store.remove({
      telegram_user_id: ctx.from.id,
      chat_id: ctx.chat.id,
      market_id: marketId,
    });
    await ctx.reply(`Stopped watching #${marketId}.`);
  });

  bot.command('watchlist', async (ctx) => {
    if (!ctx.from) throw new Error('Telegram user unavailable.');
    const watches = await store.listForChat({
      telegram_user_id: ctx.from.id,
      chat_id: ctx.chat.id,
    });
    if (watches.length === 0) {
      await ctx.reply('No watched markets yet. Use /watch <id>.');
      return;
    }
    await ctx.reply(`Watching:\n${watches.map((watch) => `#${watch.market_id} (${watch.last_status ?? 'unknown'})`).join('\n')}`);
  });

  bot.command('redeemable', async (ctx) => {
    const raw = ctx.match.toString().trim();
    const wallet = getAddress(raw);
    const markets = await client.markets.list();
    const finalized = markets.filter((market) => market.status === 'FINALIZED');
    if (finalized.length === 0) {
      await ctx.reply('No finalized markets are available to check yet.');
      return;
    }

    const rows = finalized
      .slice(0, 10)
      .map((market) => `#${market.marketId} ${escapeHtml(market.title)} - ${market.finalOutcomeIndex ?? 'unknown'}`)
      .join('\n');

    await ctx.reply(
      `Wallet ${wallet} can check these finalized markets in the app:\n\n${rows}`,
      { reply_markup: new InlineKeyboard().url('Open Portfolio', new URL('/my-bets', config.appUrl).toString()) },
    );
  });

  bot.catch((error) => {
    console.error('Telegram bot error:', error.error);
    const message = error.error instanceof Error ? error.error.message : 'Something went wrong.';
    void error.ctx.reply(message).catch(() => undefined);
  });

  return {
    bot,
    client,
    store,
    startAlerts: () =>
      startAlertWorker({
        bot,
        client,
        store,
        appUrl: config.appUrl,
        intervalMs: config.alertPollIntervalMs,
      }),
  };
}
