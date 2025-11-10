import * as dotenv from 'dotenv';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { NlpManager } from 'node-nlp';

import * as fs from 'fs';
import WAValidator from 'multicoin-address-validator';
import { getQuote, createShift, pollShiftStatus, cancelShift, getAvailableCoins } from './sideshift';
import { trainAndSaveNlpModel } from './nlp';
import express from 'express';
// Advanced features imports
import { getMarketTrend } from './marketData';
import { getFeeBreakdown } from './fees';
import { addAlert, checkAlerts, getAlertsForPair } from './alerts';
import { addSwap, getUserHistory } from './history';
import { detectNetwork } from './addressDetect';
import { predictInputError } from './errorPredict';
import { handleNaturalLanguage } from './aiAssistant';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

// Initialize bot variable
let bot: TelegramBot;

// Add Express server for Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Telegram bot is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Add this to your index.js or bot.js
const axios = require('axios'); // npm install axios

// Keep the service alive on Render free tier
if (process.env.NODE_ENV === 'production') {
  const RENDER_URL = 'https://neuraxchange.onrender.com';
  const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (just under 15)
  
  function keepAlive() {
    axios.get(`${RENDER_URL}/health`)
      .then(() => console.log(`Keep-alive ping successful at ${new Date().toISOString()}`))
      .catch((error: any) => {
  console.error('Keep-alive ping failed:', error.message);
});
  }
  
  // Start the keep-alive after 1 minute
  setTimeout(() => {
    keepAlive(); // Initial ping
    setInterval(keepAlive, PING_INTERVAL); // Then every 14 minutes
  }, 60000);
}

// State management for conversations
const userConversations: { [key: number]: any } = {};

// Initialize NLP Manager
const nlpManager = new NlpManager({ languages: ['en'], forceNER: true });

// Rate limit handling
let rateLimitRetryAfter: number = 0;
let rateLimitExpiresAt: number = 0;

// --- Bot Initialization Function ---
async function initializeBot(): Promise<TelegramBot> {
  try {
    console.log('🚀 Initializing Telegram Bot...');
    
    // Check if we're still rate limited
    if (rateLimitExpiresAt > Date.now()) {
      const waitTime = Math.ceil((rateLimitExpiresAt - Date.now()) / 1000);
      console.log(`⏳ Still rate limited. Waiting ${waitTime} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }
    
    // First, create a temporary bot to clear any webhooks (but handle rate limits)
    const tempBot = new TelegramBot(token?? '', { polling: false });
    
    try {
      console.log('🔍 Checking for existing webhooks...');
      const webhookInfo = await tempBot.getWebHookInfo();
      
      if (webhookInfo.url) {
        console.log('🧹 Clearing existing webhook:', webhookInfo.url);
        await tempBot.deleteWebHook();
        console.log('✅ Webhook cleared and pending updates dropped');
      } else {
        console.log('✅ No webhook found');
      }
      
      // Get bot info
      const botInfo = await tempBot.getMe();
      console.log(`🤖 Bot username: @${botInfo.username}`);
      
    } catch (error: any) {
      if (error.response && error.response.statusCode === 429) {
        // Handle rate limiting
        const retryAfter = parseInt(error.response.body.parameters?.retry_after || '60');
        rateLimitRetryAfter = retryAfter;
        rateLimitExpiresAt = Date.now() + (retryAfter * 1000);
        
        console.log(`⚠️ Rate limited by Telegram. Need to wait ${retryAfter} seconds.`);
        console.log(`Will retry at: ${new Date(rateLimitExpiresAt).toLocaleTimeString()}`);
        
        // Don't try to close the connection if we're rate limited
        console.log('Skipping connection close due to rate limit...');
        
        // Wait for the rate limit to expire
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 + 1000)); // Add 1 second buffer
      } else {
        console.error('⚠️ Error during webhook cleanup:', error.message);
      }
    }
    
    // Wait a moment to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now create the actual bot with polling
    console.log('📡 Starting bot with polling...');
    bot = new TelegramBot(token?? '', { 
      polling: {
        interval: 2000, // Increased interval to avoid rate limits
        autoStart: true,
        params: {
          timeout: 30,
          allowed_updates: ['message', 'callback_query']
        }
      }
    });
    
    // Add polling error handler
    bot.on('polling_error', (error: any) => {
      console.error('❌ Polling error:', error.message);
      
      if (error.code === 'ETELEGRAM' && error.response?.statusCode === 429) {
        const retryAfter = parseInt(error.response.body?.parameters?.retry_after || '60');
        rateLimitRetryAfter = retryAfter;
        rateLimitExpiresAt = Date.now() + (retryAfter * 1000);
        
        console.error(`
⚠️  RATE LIMITED: Need to wait ${retryAfter} seconds`);
        console.error(`Will resume at: ${new Date(rateLimitExpiresAt).toLocaleTimeString()}
`);
        
        // Stop polling and restart after the rate limit expires
        bot.stopPolling();
        
        setTimeout(async () => {
          console.log('Attempting to restart after rate limit...');
          try {
            await bot.startPolling();
            console.log('✅ Polling restarted successfully');
          } catch (err) {
            console.error('Failed to restart polling:', err);
            process.exit(1);
          }
        }, (retryAfter + 1) * 1000);
        
      } else if (error.message?.includes('409')) {
        console.error('CONFLICT: Another bot instance is running!');
        console.error('Possible solutions:');
        console.error('1. Check if bot is running on Render or another server');
        console.error('2. Check for other local instances');
        console.error('3. Wait 1-2 minutes and restart');
        
        // Exit after a delay to allow reading the message
        setTimeout(() => {
          process.exit(1);
        }, 3000);
      }
    });
    
    console.log('✅ Bot initialized successfully!');
    return bot;
    
  } catch (error: any) {
    console.error('❌ Failed to initialize bot:', error.message);
    
    // Check if it's a rate limit error
    if (error.code === 'ETELEGRAM' && error.response?.statusCode === 429) {
      const retryAfter = parseInt(error.response.body?.parameters?.retry_after || '60');
      console.error(`Rate limited. Please wait ${retryAfter} seconds and try again.`);
      console.error(`Try again at: ${new Date(Date.now() + retryAfter * 1000).toLocaleTimeString()}`);
    }
    
    throw error;
  }
}

// --- Main Initialization ---
async function startApplication() {
  try {
    console.log('🚀 Starting NeuraXchange Bot...');

    // 1. Fetch live coin data from SideShift
    const allCoins = await getAvailableCoins();

    // 2. Train the NLP model with the live data
    await trainAndSaveNlpModel(allCoins);

    // 3. Load the newly trained model
    const modelData = fs.readFileSync('model.nlp', 'utf8');
    nlpManager.import(modelData);
    console.log('✅ NLP model loaded successfully');
    
    // 4. Initialize the bot
    await initializeBot();
    
    // 5. Start Express server
    app.listen(PORT, () => {
      console.log(`🌐 HTTP Server listening on port ${PORT}`);
    });
    
    console.log('✅ Bot is running! Press Ctrl+C to stop.');
    
    // 6. Set up all bot handlers
    setupBotHandlers();
    
    // 7. Start periodic alert checks
    setInterval(() => checkAlerts(bot), 30000); // Check every 30 seconds
    console.log('⏰ Price alert checker started');
    
  } catch (error: any) {
    console.error('❌ Failed to start application:', error);
    
    if (error.code === 'ETELEGRAM' && error.response?.statusCode === 429) {
      console.log('The bot is currently rate limited by Telegram.');
      console.log('Please wait a few minutes before trying again.');
      console.log('The HTTP health check server will continue running.');
      
      // Keep the Express server running for health checks
      app.listen(PORT, () => {
        console.log(`🌐 HTTP Server listening on port ${PORT} (bot is rate limited)`);
      });
      
      // Don't exit, just wait
      return;
    }
    
    process.exit(1);
  }
}

// --- Setup Bot Handlers ---
function setupBotHandlers() {
  
  // --- Helper Function ---
  const defaultNetworks: { [key: string]: string } = {
    btc: 'bitcoin',
    eth: 'ethereum',
    sol: 'solana',
    usdt: 'ethereum',
    usdc: 'ethereum',
  };

  const parseCoinAndNetwork = (input: string) => {
    const match = input.match(/(.+)\s\((.+)\)/);
    if (match) {
      const coin = match[1].trim().toLowerCase();
      const network = match[2].trim().toLowerCase();
      return { coin, network };
    }
    const coin = input.trim().toLowerCase();
    return { coin, network: defaultNetworks[coin] };
  };

  // --- COMMAND HANDLERS ---

  const helpMessage = `
👋 Welcome to NeuraXchange!

Here are the available commands:
/swap - Start a new cryptocurrency swap.
/price - Check the price of a cryptocurrency pair.
/alert - Set a price alert.
/coins - See the list of available coins.


You can also talk to me in natural language. For example: "swap 0.1 btc to eth" or "what is the price of solana".
`;

  bot.onText(/\/start|\/help/, (msg: Message) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/swap/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `Let's start your swap. Please choose the coin you want to swap FROM:`;
    const coins = await getAvailableCoins();
    const popular = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'DAI'];
    const keyboard = [
      popular.slice(0, 3).map(c => ({ text: c, callback_data: `from_${c}` })),
      popular.slice(3, 6).map(c => ({ text: c, callback_data: `from_${c}` })),
      [{ text: '🔍 More coins...', callback_data: 'from_more' }]
    ];
    bot.sendMessage(chatId, welcomeMessage, {
      reply_markup: { inline_keyboard: keyboard }
    });
    userConversations[chatId] = { state: 'selecting_from_coin', details: {} };
  });

  // Coins command - Show available coins and allow inspecting networks via buttons
  bot.onText(/\/coins/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      bot.sendMessage(chatId, "⏳ Fetching available coins...");
      const coins = await getAvailableCoins();
      const all = coins.map((c: any) => c.coin.toUpperCase()).sort();
      const rows: any[] = [];
      const sample = all.slice(0, 24);
      for (let i = 0; i < sample.length; i += 3) {
        rows.push(sample.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `coin_info_${c}` })));
      }
      // Add a 'more' button that instructs using the API or reload
      rows.push([{ text: '🔁 Show more (use /coins again)', callback_data: 'noop' }]);
      bot.sendMessage(chatId, `🏦 Available Coins (sample):`, { reply_markup: { inline_keyboard: rows } });
    } catch (error) {
      bot.sendMessage(chatId, "⚠️ Sorry, I couldn't fetch the coin list right now. Please try again later.");
    }
  });

  // Cancel command 
  bot.onText(/\/cancel/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const userState = userConversations[chatId];

    if (!userState) {
      bot.sendMessage(chatId, "There is no active order to cancel.");
      return;
    }

    // Case 1: A live order has been created with SideShift
    if (userState.state === 'polling_status' && userState.shiftId) {
      clearInterval(userState.intervalId); // Stop polling immediately

      const fiveMinutes = 5 * 60 * 1000;
      const elapsedTime = Date.now() - userState.createdAt;

      // If it's too early to cancel, schedule it
      if (elapsedTime < fiveMinutes) {
        const remainingTime = fiveMinutes - elapsedTime;
        bot.sendMessage(chatId, `⏳ SideShift orders can only be cancelled after 5 minutes. I have scheduled this order for cancellation in about ${Math.ceil(remainingTime / 60000)} minute(s). Please do not send any funds.`);
        
        setTimeout(async () => {
          try {
            // Check if the user state still exists before running the scheduled cancel
            const currentState = userConversations[chatId];
            if (currentState && currentState.shiftId === userState.shiftId) {
              await cancelShift(userState.shiftId);
              bot.sendMessage(chatId, "✅ Your order has now been successfully cancelled.");
            }
          } catch (error) {
            bot.sendMessage(chatId, "⚠️ The scheduled cancellation failed. The order may have expired on its own. Please do not send any funds.");
          }
        }, remainingTime);

      } else { // Otherwise, cancel immediately
        try {
          await cancelShift(userState.shiftId);
          bot.sendMessage(chatId, "❌ Your active order has been successfully cancelled.");
        } catch (error) {
          bot.sendMessage(chatId, "⚠️ Could not cancel the order via API, it may have already expired or been processed. Please do not send any funds.");
        }
      }
    } else { // Case 2: The request is just pending in the bot's memory
      bot.sendMessage(chatId, "❌ Your pending request has been cancelled.");
    }

    delete userConversations[chatId]; // Clear the state for this user in all cases
  });

  bot.onText(/\/price$/, async (msg: Message) => {
    const chatId = msg.chat.id;
    // Start a button-driven price check flow
    const coins = await getAvailableCoins();
    const all = coins.map((c: any) => c.coin.toUpperCase()).sort();
    const sample = all.slice(0, 18);
    const rows: any[] = [];
    for (let i = 0; i < sample.length; i += 3) {
      rows.push(sample.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `price_from_${c}` })));
    }
    rows.push([{ text: '🔍 Show more in /coins', callback_data: 'noop' }]);
    bot.sendMessage(chatId, 'Select a base coin to check price (1 unit):', { reply_markup: { inline_keyboard: rows } });
  });

  bot.onText(/\/alert/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const coins = await getAvailableCoins();
    const popular = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'DAI'];
    const keyboard = [
      popular.slice(0, 3).map(c => ({ text: c, callback_data: `alert_from_${c}` })),
      popular.slice(3, 6).map(c => ({ text: c, callback_data: `alert_from_${c}` })),
      [{ text: '🔍 More coins...', callback_data: 'alert_from_more' }]
    ];
    bot.sendMessage(chatId, 'Select the base coin for the alert (FROM):', {
      reply_markup: { inline_keyboard: keyboard }
    });
    userConversations[chatId] = { state: 'setting_alert_from', details: {} };
  });

  bot.onText(/\/price (.+) to (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match) return;

    const from = parseCoinAndNetwork(match[1]);
    const to = parseCoinAndNetwork(match[2]);

    try {
      bot.sendMessage(chatId, `⏳ Checking the price for 1 ${from.coin.toUpperCase()} to ${to.coin.toUpperCase()}...`);
      const quote = await getQuote({
        depositCoin: from.coin,
        depositNetwork: from.network,
        settleCoin: to.coin,
        settleNetwork: to.network,
        depositAmount: "1"
      });
      bot.sendMessage(chatId, `📈 1 ${quote.depositCoin.toUpperCase()} ≈ ${quote.settleAmount} ${quote.settleCoin.toUpperCase()}`);
    } catch (error) {
      bot.sendMessage(chatId, `⚠️ Sorry, I couldn't get the price for that pair. Please check the coin tickers and try again.`);
    }
  });

  // --- CALLBACK QUERY HANDLER (FOR BUTTONS) ---

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message!.chat.id;
    const userState = userConversations[chatId];
    const originalMessageId = callbackQuery.message!.message_id;
    const data = callbackQuery.data;
    await bot.answerCallbackQuery(callbackQuery.id);

    // Alert creation flow
    if (data && data.startsWith('alert_from_')) {
      const fromCoin = data.replace('alert_from_', '');
      if (fromCoin === 'more') {
        // Show all coins as buttons
        const coins = await getAvailableCoins();
        const all = coins.map((c: any) => c.coin.toUpperCase()).sort();
        const rows = [];
        for (let i = 0; i < all.length; i += 3) {
          rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `alert_from_${c}` })));
        }
        bot.editMessageText('Select the base coin for the alert (FROM):', {
          chat_id: chatId,
          message_id: originalMessageId,
          reply_markup: { inline_keyboard: rows }
        });
        return;
      }
      userConversations[chatId] = { state: 'setting_alert_to', details: { fromCoin } };
      const coins = await getAvailableCoins();
      const all = coins.map((c: any) => c.coin.toUpperCase()).filter((c: string) => c !== fromCoin).sort();
      const rows = [];
      for (let i = 0; i < all.length; i += 3) {
        rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `alert_to_${c}` })));
      }
      bot.editMessageText(`Alert for *${fromCoin}* to which coin?`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows }
      });
      return;
    }

    if (data && data.startsWith('alert_to_')) {
      const toCoin = data.replace('alert_to_', '');
      if (!userState || !userState.details.fromCoin) {
        bot.sendMessage(chatId, '⚠️ Please start a new alert with /alert.');
        return;
      }
      userConversations[chatId].details.toCoin = toCoin;
      userConversations[chatId].state = 'setting_alert_direction';
      bot.editMessageText(`Alert for *${userState.details.fromCoin}* to *${toCoin}*.
Notify when the rate is:`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬆️ Above', callback_data: 'alert_dir_above' }, { text: '⬇️ Below', callback_data: 'alert_dir_below' }]
          ]
        }
      });
      return;
    }

    if (data && data.startsWith('alert_dir_')) {
      const direction = data.replace('alert_dir_', '');
      if (!userState || !userState.details.toCoin) {
        bot.sendMessage(chatId, '⚠️ Please start a new alert with /alert.');
        return;
      }
      userConversations[chatId].details.direction = direction;
      userConversations[chatId].state = 'setting_alert_rate';
      bot.editMessageText(`Notify when *${userState.details.fromCoin}/${userState.details.toCoin}* is ${direction} what rate?`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown'
      });
      return;
    }

    // Step 1: User picks FROM coin
    if (data && data.startsWith('from_')) {
      let fromCoin = data.replace('from_', '');
      if (fromCoin === 'more') {
        // Show all coins as buttons (paginated if needed)
        const coins = await getAvailableCoins();
        const all = coins.map((c: any) => c.coin.toUpperCase()).sort();
        const rows = [];
        for (let i = 0; i < all.length; i += 3) {
          rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `from_${c}` })));
        }
        bot.editMessageText('Select the coin you want to swap FROM:', {
          chat_id: chatId,
          message_id: originalMessageId,
          reply_markup: { inline_keyboard: rows }
        });
        return;
      }
      // Show network selection for FROM coin
      const coins = await getAvailableCoins();
      const coinObj = coins.find((c: any) => c.coin.toUpperCase() === fromCoin);
      let networks: string[] = [];
      if (coinObj && Array.isArray(coinObj.networks)) {
        networks = coinObj.networks.map((n: any) => typeof n === 'string' ? n : n.network).filter(Boolean);
      }
      if (networks.length > 1) {
        const rows = [];
        for (let i = 0; i < networks.length; i += 2) {
          rows.push(networks.slice(i, i + 2).map((n: string) => ({ text: n, callback_data: `fromnet_${fromCoin}_${n}` })));
        }
        bot.editMessageText(`Select the network for *${fromCoin}* you want to swap FROM:`, {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: rows }
        });
        return;
      }
      // If only one or no network, proceed to TO coin selection
      userConversations[chatId] = { state: 'selecting_to_coin', details: { fromCoin, fromNetwork: networks[0] || undefined } };
      const all = coins.map((c: any) => c.coin.toUpperCase()).filter((c: string) => c !== fromCoin).sort();
      const rows = [];
      for (let i = 0; i < all.length; i += 3) {
        rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `to_${c}` })));
      }
      bot.editMessageText(`You chose *${fromCoin}*${networks[0] ? ` on *${networks[0]}*` : ''}.
Now select the coin you want to swap TO:`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows }
      });
      return;
    }

    // Step 1b: User picks FROM network
    if (data && data.startsWith('fromnet_')) {
      const [ , fromCoin, fromNetwork ] = data.split('_');
      userConversations[chatId] = { state: 'selecting_to_coin', details: { fromCoin, fromNetwork } };
      const coins = await getAvailableCoins();
      const all = coins.map((c: any) => c.coin.toUpperCase()).filter((c: string) => c !== fromCoin).sort();
      const rows = [];
      for (let i = 0; i < all.length; i += 3) {
        rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `to_${c}` })));
      }
      bot.editMessageText(`You chose *${fromCoin}* on *${fromNetwork}*.
Now select the coin you want to swap TO:`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows }
      });
      return;
    }

    // Step 2: User picks TO coin
    if (data && data.startsWith('to_')) {
      const toCoin = data.replace('to_', '');
      if (!userState || !userState.details.fromCoin) {
        bot.sendMessage(chatId, '⚠️ Please start a new swap with /start.');
        return;
      }
      // Show network selection for TO coin
      const coins = await getAvailableCoins();
      const coinObj = coins.find((c: any) => c.coin.toUpperCase() === toCoin);
      let networks: string[] = [];
      if (coinObj && Array.isArray(coinObj.networks)) {
        networks = coinObj.networks.map((n: any) => typeof n === 'string' ? n : n.network).filter(Boolean);
      }
      if (networks.length > 1) {
        const rows = [];
        for (let i = 0; i < networks.length; i += 2) {
          rows.push(networks.slice(i, i + 2).map((n: string) => ({ text: n, callback_data: `tonet_${toCoin}_${n}` })));
        }
        bot.editMessageText(`Select the network for *${toCoin}* you want to swap TO:`, {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: rows }
        });
        return;
      }
      // If only one or no network, proceed to amount entry
      userConversations[chatId] = {
        state: 'entering_amount',
        details: {
          fromCoin: userState.details.fromCoin,
          fromNetwork: userState.details.fromNetwork,
          toCoin,
          toNetwork: networks[0] || undefined
        }
      };
      bot.editMessageText(`You want to swap *${userState.details.fromCoin}*${userState.details.fromNetwork ? ` on *${userState.details.fromNetwork}*` : ''} to *${toCoin}*${networks[0] ? ` on *${networks[0]}*` : ''}.
\nPlease enter the amount of *${userState.details.fromCoin}* you want to swap:`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown'
      });
      return;
    }

    // Step 2b: User picks TO network
    if (data && data.startsWith('tonet_')) {
      const [ , toCoin, toNetwork ] = data.split('_');
      if (!userState || !userState.details.fromCoin) {
        bot.sendMessage(chatId, '⚠️ Please start a new swap with /start.');
        return;
      }
      userConversations[chatId] = {
        state: 'entering_amount',
        details: {
          fromCoin: userState.details.fromCoin,
          fromNetwork: userState.details.fromNetwork,
          toCoin,
          toNetwork
        }
      };
      bot.editMessageText(`You want to swap *${userState.details.fromCoin}*${userState.details.fromNetwork ? ` on *${userState.details.fromNetwork}*` : ''} to *${toCoin}* on *${toNetwork}*.
\nPlease enter the amount of *${userState.details.fromCoin}* you want to swap:`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown'
      });
      return;
    }

    // Additional quick-action handlers: back, retry, price/coins, swap again
    if (data === 'back_amount') {
      // Return to amount entry keeping details
      if (userState && (userState.state === 'awaiting_confirmation' || userState.state === 'entering_amount' || userState.state === 'selecting_to_coin')) {
        userConversations[chatId].state = 'entering_amount';
        bot.editMessageText('Please enter the amount you want to swap:', { chat_id: chatId, message_id: originalMessageId });
      }
      return;
    }

    if (data === 'back_to_from') {
      // Start from coin selection again
      const popular = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'DAI'];
      const keyboard = [
        popular.slice(0, 3).map(c => ({ text: c, callback_data: `from_${c}` })),
        popular.slice(3, 6).map(c => ({ text: c, callback_data: `from_${c}` })),
        [{ text: '🔍 More coins...', callback_data: 'from_more' }]
      ];
      userConversations[chatId] = { state: 'selecting_from_coin', details: {} };
      bot.editMessageText('Select the coin you want to swap FROM:', { chat_id: chatId, message_id: originalMessageId, reply_markup: { inline_keyboard: keyboard } });
      return;
    }

    if (data === 'try_quote') {
      // Ask user to re-enter amount
      if (userState && userState.state === 'entering_amount') {
        bot.editMessageText('Please enter the amount you want to swap (try a different amount):', { chat_id: chatId, message_id: originalMessageId });
        userConversations[chatId].state = 'entering_amount';
      } else {
        bot.sendMessage(chatId, 'Please enter the amount you want to swap.');
        userConversations[chatId] = { state: 'entering_amount', details: userState?.details || {} };
      }
      return;
    }

    if (data === 'swap_again') {
      // Shortcut to start another swap
      const popular = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'DAI'];
      const keyboard = [
        popular.slice(0, 3).map(c => ({ text: c, callback_data: `from_${c}` })),
        popular.slice(3, 6).map(c => ({ text: c, callback_data: `from_${c}` })),
        [{ text: '🔍 More coins...', callback_data: 'from_more' }]
      ];
      userConversations[chatId] = { state: 'selecting_from_coin', details: {} };
      bot.sendMessage(chatId, 'Ready for a new swap. Select the coin you want to swap FROM:', { reply_markup: { inline_keyboard: keyboard } });
      return;
    }

    // Price command button flow handlers
    if (data && data.startsWith('price_from_')) {
      const from = data.replace('price_from_', '');
      // Show list of possible 'to' coins
      const coins = await getAvailableCoins();
      const all = coins.map((c: any) => c.coin.toUpperCase()).filter((c: string) => c !== from).sort();
      const rows = [];
      for (let i = 0; i < all.length; i += 3) {
        rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `price_to_${from}_${c}` })));
      }
      bot.editMessageText(`Price: from *${from}* to which coin?`, { chat_id: chatId, message_id: originalMessageId, parse_mode: 'Markdown', reply_markup: { inline_keyboard: rows } });
      return;
    }

    if (data && data.startsWith('price_to_')) {
      const [, from, to] = data.split('_');
      try {
        bot.sendMessage(chatId, `⏳ Checking the price for 1 ${from} to ${to}...`);
        const quote = await getQuote({ depositCoin: from.toLowerCase(), settleCoin: to.toLowerCase(), depositAmount: '1' });
        bot.sendMessage(chatId, `📈 1 ${quote.depositCoin.toUpperCase()} ≈ ${quote.settleAmount} ${quote.settleCoin.toUpperCase()}`);
      } catch (err) {
        bot.sendMessage(chatId, `⚠️ Sorry, I couldn't get the price for that pair. Try a different pair or use /price <coin> to <coin>.`);
      }
      return;
    }

    // /coins interactive: show networks for a selected coin
    if (data && data.startsWith('coin_info_')) {
      const coinSym = data.replace('coin_info_', '').toLowerCase();
      const coins = await getAvailableCoins();
      const coinObj = coins.find((c: any) => c.coin.toLowerCase() === coinSym);
      if (!coinObj) {
        bot.sendMessage(chatId, 'Coin not found.');
        return;
      }
      const networks = Array.isArray(coinObj.networks) ? coinObj.networks.map((n: any) => typeof n === 'string' ? n : n.network) : [];
      let text = `*${coinObj.coin.toUpperCase()}* - ${coinObj.name || ''}\n\nNetworks:\n` + (networks.length ? networks.join('\n') : 'None');
      bot.editMessageText(text, { chat_id: chatId, message_id: originalMessageId, parse_mode: 'Markdown' });
      return;
    }

    // Existing confirm/cancel logic
    if (data === 'confirm_swap') {
      if (userState && userState.state === 'awaiting_confirmation') {
        bot.editMessageText(`✅ You confirmed the swap.`, { chat_id: chatId, message_id: originalMessageId });
        bot.sendMessage(chatId, `➡️ Great! Please provide the destination wallet address for your ${userState.details.toCurrency}.`);
        userConversations[chatId].state = 'awaiting_address';
      }
    }
    if (data === 'cancel_swap') {
      bot.editMessageText(`❌ Swap cancelled.`, { chat_id: chatId, message_id: originalMessageId });
      delete userConversations[chatId];
    }
  });

  // --- MAIN MESSAGE HANDLER ---

  bot.on('message', async (msg: Message) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userState = userConversations[chatId];

    // State: Setting Alert Rate
    if (userState && userState.state === 'setting_alert_rate') {
      const rate = parseFloat(msg.text.trim());

      if (isNaN(rate) || rate <= 0) {
        bot.sendMessage(chatId, '⚠️ Please enter a valid positive number for the rate.');
        return;
      }

      const { fromCoin, toCoin, direction } = userState.details;

      addAlert({
        chatId,
        from: fromCoin.toLowerCase(),
        to: toCoin.toLowerCase(),
        targetRate: rate,
        direction: direction
      });

      bot.sendMessage(chatId, `✅ Alert created! I will notify you when *${fromCoin}/${toCoin}* goes ${direction} *${rate}*.`, { parse_mode: 'Markdown' });
      delete userConversations[chatId];
      return;
    }

    // State 1.5: Entering amount (button-driven flow)
    if (userState && userState.state === 'entering_amount') {
      const amount = msg.text.trim();

      // Allow a simple 'max' button response (informative) - API doesn't provide max reliably
      if (/^max$/i.test(amount)) {
        bot.sendMessage(chatId, "⚠️ 'Max' is not supported by SideShift in this flow. Please enter the numeric amount you want to swap (e.g., 0.1).");
        return;
      }

      // Validate amount is a positive number
      if (!/^\d*\.?\d+$/.test(amount) || parseFloat(amount) <= 0) {
        bot.sendMessage(chatId, '⚠️ Please enter a valid positive number (e.g., 0.1).');
        return;
      }

      const { fromCoin, fromNetwork, toCoin, toNetwork } = userState.details;

      // --- Advanced: Show market trend and fee breakdown ---
      let trendMsg = '';
      let feeMsg = '';
      try {
        const trend = await getMarketTrend(fromCoin, toCoin);
        if (trend) {
          trendMsg = `\n📊 24h trend: ${trend.direction === 'up' ? '⬆️' : trend.direction === 'down' ? '⬇️' : '⏸'} ${trend.trendPct > 0 ? '+' : ''}${trend.trendPct}%`;
        }
        const fees = await getFeeBreakdown(fromCoin, toCoin, amount);
        if (fees) {
          feeMsg = `\n💸 Fees: Network ${fees.networkFee.toFixed(8)} + Service ${fees.serviceFee.toFixed(8)} = Total ${fees.totalFee.toFixed(8)}`;
        }
      } catch (e) {
        // Ignore errors in trend/fee for now
      }

      try {
        bot.sendMessage(chatId, '⏳ Fetching a live quote from SideShift...');

        const quote = await getQuote({
          depositCoin: fromCoin.toLowerCase(),
          depositNetwork: fromNetwork ? fromNetwork.toLowerCase() : undefined,
          settleCoin: toCoin.toLowerCase(),
          settleNetwork: toNetwork ? toNetwork.toLowerCase() : undefined,
          depositAmount: amount
        });

        const rate = (parseFloat(quote.settleAmount) / parseFloat(quote.depositAmount)).toFixed(8);

        const confirmationText =
          `🤔 Please confirm your swap:\n\n` +
          `From: ${quote.depositAmount} ${quote.depositCoin.toUpperCase()}` +
          `${fromNetwork ? ` on ${fromNetwork}` : ''}\n` +
          `To: ${quote.settleAmount} ${quote.settleCoin.toUpperCase()}` +
          `${toNetwork ? ` on ${toNetwork}` : ''}\n` +
          `Rate: 1 ${quote.depositCoin.toUpperCase()} = ${rate} ${quote.settleCoin.toUpperCase()}` +
          trendMsg + feeMsg;

        userConversations[chatId] = {
          state: 'awaiting_confirmation',
          details: {
            quoteId: quote.id,
            toCurrency: quote.settleCoin.toUpperCase(),
            fromCurrency: quote.depositCoin.toUpperCase(),
            fromCoin,
            toCoin,
            fromNetwork,
            toNetwork
          }
        };

        bot.sendMessage(chatId, confirmationText, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Confirm', callback_data: 'confirm_swap' },
                { text: '✏️ Change Amount', callback_data: 'back_amount' },
                { text: '❌ Cancel', callback_data: 'cancel_swap' }
              ],
              [ { text: '⬅️ Back to coin selection', callback_data: 'back_to_from' } ]
            ]
          }
        });

        // --- Analytics/history: record swap intent ---
        addSwap({ chatId, from: fromCoin, to: toCoin, amount, date: new Date().toISOString() });

      } catch (error: any) {
        console.error('Quote error (entering_amount):', error?.message || error);
        bot.sendMessage(chatId, '⚠️ Sorry, I couldn\'t get a quote for that pair or amount.', {
          reply_markup: {
            inline_keyboard: [[
              { text: '🔁 Try again', callback_data: 'try_quote' },
              { text: '🔁 Change pair', callback_data: 'back_to_from' }
            ]]
          }
        });
        // leave state so user can retry
      }
      return;
    }

    // State 2: Awaiting Address
    if (userState && userState.state === 'awaiting_address') {
      const settleAddress = msg.text!;
      const { toCurrency, fromCurrency } = userState.details;

      // --- Auto-detect network from address ---
      const detectedNet = detectNetwork(settleAddress);
      if (detectedNet) {
        bot.sendMessage(chatId, `ℹ️ Detected network: ${detectedNet}`);
      }

      // --- Error prediction for incompatible chains ---
      const predErr = await predictInputError(fromCurrency, toCurrency, settleAddress);
      if (predErr) {
        bot.sendMessage(chatId, `⚠️ Warning: ${predErr}`);
      }

      const isValidAddress = WAValidator.validate(settleAddress, toCurrency);

      if (!isValidAddress) {
        bot.sendMessage(chatId, `⚠️ That doesn't look like a valid ${toCurrency} address. Please double-check and send it again.`);
        return;
      }
      
      userConversations[chatId].details.settleAddress = settleAddress;
      userConversations[chatId].state = 'awaiting_refund_address';

      bot.sendMessage(chatId, `✅ Address valid. Now, please provide a refund address for your ${fromCurrency} (optional, type 'skip' if not needed).`);
      
      return;
    }

    // State 3: Awaiting Refund Address
    if (userState && userState.state === 'awaiting_refund_address') {
      const refundAddress = msg.text!;
      const { quoteId, settleAddress, fromCurrency } = userState.details;

      let shiftParams: any = { quoteId, settleAddress };

      if (refundAddress.toLowerCase() !== 'skip') {
        const isValidRefundAddress = WAValidator.validate(refundAddress, fromCurrency);
        if (!isValidRefundAddress) {
          bot.sendMessage(chatId, `⚠️ That doesn't look like a valid ${fromCurrency} refund address. Please double-check and send it again, or type 'skip'.`);
          return;
        }
        shiftParams.refundAddress = refundAddress;
      }

      try {
        bot.sendMessage(chatId, '✅ Got it. Creating your shift...');
        const shift = await createShift(shiftParams);

        bot.sendMessage(chatId, `✨ Shift created! Please send exactly ${shift.depositAmount} ${shift.depositCoin.toUpperCase()} to the following address:
\`${shift.depositAddress}\`
I will notify you of any updates. You can type /cancel at any time before sending funds.`, { parse_mode: 'Markdown' });
        
        userConversations[chatId].state = 'polling_status';
        userConversations[chatId].shiftId = shift.id;
        userConversations[chatId].createdAt = Date.now(); 
        
        const intervalId = setInterval(async () => {
          if (!userConversations[chatId]) {
            clearInterval(intervalId);
            return;
          }
          try {
            const statusResponse = await pollShiftStatus(shift.id);
            if (statusResponse.status !== userConversations[chatId].lastStatus) {
              bot.sendMessage(chatId, `🔄 Swap Status Update: *${statusResponse.status}*`, { parse_mode: 'Markdown' });
              userConversations[chatId].lastStatus = statusResponse.status;
            }
            if (['complete', 'refunded', 'rejected', 'expired'].includes(statusResponse.status)) {
              clearInterval(intervalId);
              // Offer a quick 'Swap Again' button when finished
              await bot.sendMessage(chatId, `✨ Swap finished: *${statusResponse.status}*`, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [[{ text: '🔁 Swap Again', callback_data: 'swap_again' }]] }
              });
              delete userConversations[chatId];
            }
          } catch (error) {
            console.error('Error polling status:', error);
          }
        }, 30000);

        userConversations[chatId].intervalId = intervalId;

      } catch (error) {
        bot.sendMessage(chatId, '⚠️ An error occurred while creating the shift. Please try again.');
        delete userConversations[chatId];
      }
      return;
    }

    // State 0: Initial Request
    // --- AI assistant: handle advanced natural language ---
    if (/help|cheapest|best|track|history|portfolio|alert|notify|export|csv|progress|trend|fee|network|address|error|detect|ai|assistant/i.test(msg.text)) {
      // If user asks for advanced features, route to AI assistant
      const aiResp = await handleNaturalLanguage(msg.text, chatId);
      bot.sendMessage(chatId, aiResp);
      return;
    }

    const nlpResponse = await nlpManager.process('en', msg.text);
    if (nlpResponse.intent === 'swap.crypto') {
      const amountEntity = nlpResponse.entities.find((ent: any) => ent.entity === 'number');
      const currencyEntities = nlpResponse.entities.filter((ent: any) => ent.entity === 'currency');
      const networkEntity = nlpResponse.entities.find((ent: any) => ent.entity === 'network');

      if (amountEntity && currencyEntities && currencyEntities.length >= 2) {
        const amount = amountEntity.resolution.value;
        const fromCurrency = currencyEntities[0].option;
        const toCurrency = currencyEntities[1].option;
        const network = networkEntity ? networkEntity.option : undefined;

        // --- Advanced: Show market trend and fee breakdown ---
        let trendMsg = '';
        let feeMsg = '';
        try {
          const trend = await getMarketTrend(fromCurrency, toCurrency);
          if (trend) {
            trendMsg = `\n📊 24h trend: ${trend.direction === 'up' ? '⬆️' : trend.direction === 'down' ? '⬇️' : '⏸'} ${trend.trendPct > 0 ? '+' : ''}${trend.trendPct}%`;
          }
          const fees = await getFeeBreakdown(fromCurrency, toCurrency, amount);
          if (fees) {
            feeMsg = `\n💸 Fees: Network ${fees.networkFee.toFixed(8)} + Service ${fees.serviceFee.toFixed(8)} = Total ${fees.totalFee.toFixed(8)}`;
          }
        } catch (e) {
          // Ignore errors in trend/fee for now
        }

        try {
          bot.sendMessage(chatId, '⏳ Fetching a live quote from SideShift...');
          
          const quote = await getQuote({
            depositCoin: fromCurrency.toLowerCase(),
            settleCoin: toCurrency.toLowerCase(),
            depositAmount: amount.toString(),
            depositNetwork: network ? network.toLowerCase() : undefined
          });

          // Calculate the rate
          const rate = (parseFloat(quote.settleAmount) / parseFloat(quote.depositAmount)).toFixed(8);

          const confirmationText = 
            `🤔 Please confirm your swap:\n\n` +
            `From: ${quote.depositAmount} ${quote.depositCoin.toUpperCase()}` +
            `${network ? ` on ${network}` : ''}\n` +
            `To: ${quote.settleAmount} ${quote.settleCoin.toUpperCase()}\n\n` +
            `Rate: 1 ${quote.depositCoin.toUpperCase()} = ${rate} ${quote.settleCoin.toUpperCase()}` +
            trendMsg + feeMsg;
          
          userConversations[chatId] = {
            state: 'awaiting_confirmation',
            details: { 
              quoteId: quote.id,
              toCurrency: quote.settleCoin.toUpperCase(),
              fromCurrency: quote.depositCoin.toUpperCase()
            }
          };

          bot.sendMessage(chatId, confirmationText, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Confirm', callback_data: 'confirm_swap' },
                  { text: '❌ Cancel', callback_data: 'cancel_swap' }
                ]
              ]
            }
          });

          // --- Analytics/history: record swap intent ---
          addSwap({ chatId, from: fromCurrency, to: toCurrency, amount, date: new Date().toISOString() });

        } catch (error) {
          bot.sendMessage(chatId, `⚠️ Sorry, I couldn't get a quote for that pair. Please check the coin tickers and try again.`);
        }

      } else {
        bot.sendMessage(chatId, "I couldn't understand all the swap details. Please specify the amount, the currency to send, and the currency to receive.");
      }
    } else {
      if (!userState) {
        bot.sendMessage(chatId, "I'm not sure how to help with that. I can only process swap requests. Try /start to see an example.");
      }
    }
  });
}

// --- Graceful Shutdown ---
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  
  console.log(`
📴 Received ${signal}, shutting down gracefully...`);
  isShuttingDown = true;
  
  try {
    // Clear all active intervals
    for (const chatId in userConversations) {
      if (userConversations[chatId].intervalId) {
        clearInterval(userConversations[chatId].intervalId);
      }
    }
    
    // Stop bot polling
    if (bot) {
      await bot.stopPolling();
      console.log('✅ Bot polling stopped');
      
      // Don't try to close if we're rate limited
      if (rateLimitExpiresAt < Date.now()) {
        try {
          await bot.close();
          console.log('✅ Bot connection closed');
        } catch (err: any) {
          if (err.response?.statusCode === 429) {
            console.log('⚠️ Rate limited, skipping connection close');
          } else {
            console.error('Error closing bot:', err.message);
          }
        }
      } else {
        console.log('⚠️ Skipping connection close due to rate limit');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the application
startApplication();