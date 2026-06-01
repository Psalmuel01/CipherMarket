import 'dotenv/config';
import { loadConfig } from './config.js';
import { createCipherMarketBot } from './bot.js';

const config = loadConfig();
const { bot, startAlerts } = createCipherMarketBot(config);

startAlerts();

bot.start({
  onStart: (info) => {
    console.log(`CipherMarket Telegram bot started as @${info.username}`);
  },
});
