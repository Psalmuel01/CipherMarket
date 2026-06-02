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
/info - project summary and bot roadmap
/status - bot health

Signed actions open the CipherMarket app. The bot never holds private keys.`;

// const INFO_TEXT = `<b>About CipherMarket</b>

// CipherMarket is a privacy-preserving prediction market on Arbitrum Sepolia. Market odds, liquidity, and resolution state are public, while user positions are encrypted with CoFHE.

// This bot currently supports market discovery, quote previews, lifecycle alerts, and app deep links.

// Coming soon: richer portfolio alerts, create-market helpers, oracle/resolution actions, and a Telegram Mini App for wallet-connected flows.`;

const INFO_TEXT = `<b>🔮 About CipherMarket</b>

CipherMarket is a privacy-preserving prediction market protocol built on Arbitrum Sepolia.

Unlike traditional prediction markets where every position is publicly visible, CipherMarket uses CoFHE to keep user balances, positions, and portfolio data encrypted while preserving transparent market operation. Market odds, liquidity, volume, and resolution status remain publicly verifiable, while individual trading activity stays private.

<b>Key Features</b>
• Private trading powered by CoFHE
• Decentralized oracle-based market resolution
• Dispute and escalation mechanisms
• Portfolio tracking with encrypted balances
• Market discussions and community engagement
• Open SDK for third-party integrations

<b>What This Bot Can Do</b>
• Discover active and resolved markets
• View market details, odds, liquidity, and volume
• Preview buy and sell quotes
• Track markets with lifecycle alerts
• Check redeemable positions
• Open trading actions directly in the web app

<b>Current Status</b>
This bot is read-only and does not custody wallets or sign transactions. Trading, redeeming, and other wallet actions are completed securely through the CipherMarket web application.

<b>Coming Soon</b>
• Portfolio and position alerts
• Create-market helpers
• Oracle and resolution workflows
• Richer notification subscriptions
• Telegram Mini App with wallet-connected experiences

🌐 <a href="https://cipher-market-fhe.vercel.app/">Open CipherMarket</a>
🐦 <a href="https://x.com/ciphermarket">Follow CipherMarket on X</a>`;

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
    keyboard.text(`#${market.marketId} ${shortLabel(market.title, 18)}`, `${mode}:${market.marketId}`).row();
  });
  return keyboard;
}

function quoteOutcomeKeyboard(marketId: number, outcomes: Awaited<ReturnType<ProtocolClient['markets']['list']>>[number]['outcomes']): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  outcomes.forEach((outcome, index) => {
    keyboard.text(`#${outcome.outcomeIndex} ${shortLabel(outcome.label, 14)}`, `quote_outcome:${marketId}:${outcome.outcomeIndex}`);
    if (index % 2 === 1) keyboard.row();
  });
  return keyboard;
}

function marketKeyboard(
  appUrl: string,
  market: Awaited<ReturnType<ProtocolClient['markets']['list']>>[number],
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  keyboard.url('Open', marketLink(appUrl, market.marketId));
  keyboard.row();

  if (market.status === 'ACTIVE') {
    market.outcomes.forEach((outcome, index) => {
      keyboard.url(`Buy #${outcome.outcomeIndex}`, marketLink(appUrl, market.marketId, { action: 'buy', outcomeIndex: outcome.outcomeIndex }));
      if (index % 3 === 2) keyboard.row();
    });
    keyboard.row();
    keyboard.text('Quote', `quote:${market.marketId}`);
    keyboard.url('Sell', marketLink(appUrl, market.marketId, { action: 'sell' }));
    keyboard.row();
  } else if (market.status === 'FINALIZED') {
    keyboard.url('Redeem', marketLink(appUrl, market.marketId, { action: 'redeem' }));
    keyboard.row();
  }

  keyboard.text('Watch', `watch:${market.marketId}`);
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

  bot.command('info', async (ctx) => {
    await ctx.reply(INFO_TEXT, { parse_mode: 'HTML' });
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
      reply_markup: marketKeyboard(config.appUrl, market),
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
    if (market.status !== 'ACTIVE') {
      await ctx.reply(`Market #${market.marketId} is ${market.status}. Quotes are only available for active markets.`, {
        reply_markup: marketKeyboard(config.appUrl, market),
      });
      return;
    }

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
      reply_markup: marketKeyboard(config.appUrl, market),
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
    if (market.status !== 'ACTIVE') {
      await ctx.answerCallbackQuery({ text: 'Quotes only work for active markets.' });
      await ctx.reply(`Market #${market.marketId} is ${market.status}.`, {
        reply_markup: marketKeyboard(config.appUrl, market),
      });
      return;
    }
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
