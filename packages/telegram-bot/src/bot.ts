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
type ReplyContext = {
  reply: (text: string, options?: Parameters<Bot['api']['sendMessage']>[2]) => Promise<unknown>;
};

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

function shortLabel(value: string, maxLength = 32): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function marketsKeyboard(
  markets: Awaited<ReturnType<ProtocolClient['markets']['list']>>,
  mode: 'market' | 'watch' | 'quote',
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  markets.slice(0, 12).forEach((market) => {
    keyboard.text(`#${market.marketId} ${shortLabel(market.title, 28)}`, `${mode}:${market.marketId}`).row();
  });
  return keyboard;
}

function quoteOutcomeKeyboard(marketId: number, outcomes: Awaited<ReturnType<ProtocolClient['markets']['list']>>[number]['outcomes']): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  outcomes.forEach((outcome, index) => {
    keyboard.text(shortLabel(outcome.label, 22), `quote_outcome:${marketId}:${outcome.outcomeIndex}`);
    if (index % 2 === 1) keyboard.row();
  });
  return keyboard;
}

function marketKeyboard(
  appUrl: string,
  marketId: number,
  outcomes: Awaited<ReturnType<ProtocolClient['markets']['list']>>[number]['outcomes'],
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard.url('Open App', marketLink(appUrl, marketId));
  keyboard.row();
  outcomes.forEach((outcome, index) => {
    keyboard.url(`Buy ${shortLabel(outcome.label, 14)}`, marketLink(appUrl, marketId, { action: 'buy', outcomeIndex: outcome.outcomeIndex }));
    if (index % 2 === 1) keyboard.row();
  });
  keyboard.row();
  keyboard.text('Watch', `watch:${marketId}`);
  keyboard.text('Quote', `quote:${marketId}`);
  keyboard.row();
  keyboard.url('Sell', marketLink(appUrl, marketId, { action: 'sell' }));
  keyboard.url('Redeem', marketLink(appUrl, marketId, { action: 'redeem' }));
  return keyboard;
}

async function replyWithMarketPicker(
  ctx: ReplyContext,
  client: ProtocolClient,
  mode: 'market' | 'watch' | 'quote',
): Promise<void> {
  const markets = await client.markets.list();
  if (markets.length === 0) {
    await ctx.reply('No markets are available yet.');
    return;
  }

  const title =
    mode === 'market'
      ? 'Choose a market to inspect:'
      : mode === 'watch'
        ? 'Choose a market to watch:'
        : 'Choose a market to quote:';

  await ctx.reply(title, { reply_markup: marketsKeyboard(markets, mode) });
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
    await ctx.reply(marketListMessage(markets), {
      parse_mode: 'HTML',
      reply_markup: marketsKeyboard(markets, 'market'),
    });
  });

  bot.command('market', async (ctx) => {
    const input = ctx.match.toString().trim();
    if (!input) {
      await replyWithMarketPicker(ctx, client, 'market');
      return;
    }

    const marketId = parseMarketId(input);
    const market = await findMarket(client, marketId);
    await ctx.reply(marketDetailMessage(market), {
      parse_mode: 'HTML',
      reply_markup: marketKeyboard(config.appUrl, market.marketId, market.outcomes),
    });
  });

  bot.command('quote', async (ctx) => {
    const [idArg, outcomeArg, amountArg] = ctx.match.toString().trim().split(/\s+/);
    if (!idArg) {
      await replyWithMarketPicker(ctx, client, 'quote');
      return;
    }

    const marketId = parseMarketId(idArg);
    const market = await findMarket(client, marketId);

    if (!outcomeArg) {
      await ctx.reply(`Choose an outcome for #${market.marketId}:`, {
        reply_markup: quoteOutcomeKeyboard(market.marketId, market.outcomes),
      });
      return;
    }

    const outcomeIndex = parseOutcomeIndex(outcomeArg);
    const outcome = market.outcomes[outcomeIndex];
    if (!outcome) {
      throw new Error(`Outcome ${outcomeIndex} does not exist on market #${marketId}.`);
    }

    if (!amountArg) {
      await ctx.reply(`Enter an amount like:\n/quote ${marketId} ${outcomeIndex} 1`);
      return;
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
    const input = ctx.match.toString().trim();
    if (!input) {
      await replyWithMarketPicker(ctx, client, 'watch');
      return;
    }

    const marketId = parseMarketId(input);
    const market = await findMarket(client, marketId);
    await store.add({
      telegram_user_id: ctx.from.id,
      chat_id: ctx.chat.id,
      market_id: market.marketId,
      last_status: market.status,
    });
    await ctx.reply(`Watching #${market.marketId}: ${market.title}, current status ${market.status}.`, {
      reply_markup: new InlineKeyboard()
        .url('View Market', marketLink(config.appUrl, market.marketId))
        .text('Unwatch', `unwatch:${market.marketId}`),
    });
  });

  bot.command('unwatch', async (ctx) => {
    if (!ctx.from) throw new Error('Telegram user unavailable.');
    const input = ctx.match.toString().trim();
    if (!input) {
      const watches = await store.listForChat({
        telegram_user_id: ctx.from.id,
        chat_id: ctx.chat.id,
      });
      if (watches.length === 0) {
        await ctx.reply('No watched markets yet.');
        return;
      }
      const keyboard = new InlineKeyboard();
      watches.forEach((watch) => keyboard.text(`#${watch.market_id}`, `unwatch:${watch.market_id}`).row());
      await ctx.reply('Choose a market to unwatch:', { reply_markup: keyboard });
      return;
    }

    const marketId = parseMarketId(input);
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
    const keyboard = new InlineKeyboard();
    watches.forEach((watch) => keyboard.text(`Unwatch #${watch.market_id}`, `unwatch:${watch.market_id}`).row());
    await ctx.reply(
      `Watching:\n${watches.map((watch) => `#${watch.market_id} (${watch.last_status ?? 'unknown'})`).join('\n')}`,
      { reply_markup: keyboard },
    );
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

  bot.callbackQuery(/^market:(\d+)$/, async (ctx) => {
    const marketId = parseMarketId(ctx.match[1]);
    const market = await findMarket(client, marketId);
    await ctx.answerCallbackQuery();
    await ctx.reply(marketDetailMessage(market), {
      parse_mode: 'HTML',
      reply_markup: marketKeyboard(config.appUrl, market.marketId, market.outcomes),
    });
  });

  bot.callbackQuery(/^watch:(\d+)$/, async (ctx) => {
    if (!ctx.from || !ctx.chat) throw new Error('Telegram chat unavailable.');
    const marketId = parseMarketId(ctx.match[1]);
    const market = await findMarket(client, marketId);
    await store.add({
      telegram_user_id: ctx.from.id,
      chat_id: ctx.chat.id,
      market_id: market.marketId,
      last_status: market.status,
    });
    await ctx.answerCallbackQuery({ text: `Watching #${market.marketId}` });
    await ctx.reply(`Watching #${market.marketId}: ${market.title}, current status ${market.status}.`, {
      reply_markup: new InlineKeyboard()
        .url('View Market', marketLink(config.appUrl, market.marketId))
        .text('Unwatch', `unwatch:${market.marketId}`),
    });
  });

  bot.callbackQuery(/^unwatch:(\d+)$/, async (ctx) => {
    if (!ctx.from || !ctx.chat) throw new Error('Telegram chat unavailable.');
    const marketId = parseMarketId(ctx.match[1]);
    await store.remove({
      telegram_user_id: ctx.from.id,
      chat_id: ctx.chat.id,
      market_id: marketId,
    });
    await ctx.answerCallbackQuery({ text: `Stopped watching #${marketId}` });
    await ctx.reply(`Stopped watching #${marketId}.`);
  });

  bot.callbackQuery(/^quote:(\d+)$/, async (ctx) => {
    const marketId = parseMarketId(ctx.match[1]);
    const market = await findMarket(client, marketId);
    await ctx.answerCallbackQuery();
    await ctx.reply(`Choose an outcome for #${market.marketId}:`, {
      reply_markup: quoteOutcomeKeyboard(market.marketId, market.outcomes),
    });
  });

  bot.callbackQuery(/^quote_outcome:(\d+):(\d+)$/, async (ctx) => {
    const marketId = parseMarketId(ctx.match[1]);
    const outcomeIndex = parseOutcomeIndex(ctx.match[2]);
    await ctx.answerCallbackQuery();
    await ctx.reply(`Enter an amount like:\n/quote ${marketId} ${outcomeIndex} 1`);
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
