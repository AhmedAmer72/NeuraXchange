import * as dotenv from 'dotenv';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { NlpManager } from 'node-nlp';
import * as fs from 'fs';
import WAValidator from 'multicoin-address-validator';
import { getQuote, createShift, pollShiftStatus, cancelShift, getAvailableCoins } from './sideshift';
import { trainAndSaveNlpModel } from './nlp';
import express from 'express';

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

  bot.onText(/\/start/, (msg: Message) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `👋 Welcome to NeuraXchange! What would you like to do?\n\n` +
      `💬 You can:\n` +
      `• Just tell me what you want to swap (e.g. "swap 0.1 ETH for SOL")\n` +
      `• Check prices with /price (e.g. "/price eth to btc")\n` +
      `• See all available coins with /coins`;
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  });

  // Coins command - Show available coins and networks
  bot.onText(/\/coins/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      bot.sendMessage(chatId, "⏳ Fetching available coins...");
      const coins = await getAvailableCoins();
      
      // Group coins by network for better organization
      const networkMap = new Map<string, Set<string>>();
      let totalCoins = 0;
      
      coins.forEach((coin: any) => {
        totalCoins++;
        const networks = Array.isArray(coin.networks) ? coin.networks : [];
        networks.forEach((network: string | { network: string }) => {
          const networkName = typeof network === 'string' ? network : network.network;
          if (!networkMap.has(networkName)) {
            networkMap.set(networkName, new Set());
          }
          networkMap.get(networkName)?.add(coin.coin.toUpperCase());
        });
      });

      // Build the response message
      let message = `🏦 *Available Coins and Networks*\n`;
      message += `Total coins: ${totalCoins}\n`;
      message += `Total networks: ${networkMap.size}\n\n`;
      
      // Add network summaries
      const networkSummaries = Array.from(networkMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([network, coins]) => 
          `*${network}*: ${coins.size} coins\n_Examples: ${Array.from(coins).slice(0, 3).join(', ')}${coins.size > 3 ? '...' : ''}_`
        );
      
      message += networkSummaries.join('\n\n');
      
      message += '\n\nUse `/price <coin1> to <coin2>` to check exchange rates.';
      
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
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

  bot.onText(/\/price$/, (msg: Message) => {
    const chatId = msg.chat.id;
    const exampleMessage = `Please provide the currencies you want to check.
*Examples:*
\`/price eth to btc\`
\`/price eth (arbitrum) to sol\``;
    bot.sendMessage(chatId, exampleMessage, { parse_mode: 'Markdown' });
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

    bot.answerCallbackQuery(callbackQuery.id);

    if (callbackQuery.data === 'confirm_swap') {
      if (userState && userState.state === 'awaiting_confirmation') {
        bot.editMessageText(`✅ You confirmed the swap.`, { chat_id: chatId, message_id: originalMessageId });
        bot.sendMessage(chatId, `➡️ Great! Please provide the destination wallet address for your ${userState.details.toCurrency}.`);
        userConversations[chatId].state = 'awaiting_address';
      }
    }

    if (callbackQuery.data === 'cancel_swap') {
      bot.editMessageText(`❌ Swap cancelled.`, { chat_id: chatId, message_id: originalMessageId });
      delete userConversations[chatId];
    }
  });

  // --- MAIN MESSAGE HANDLER ---

  bot.on('message', async (msg: Message) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;
    const userState = userConversations[chatId];

    // State 2: Awaiting Address
    if (userState && userState.state === 'awaiting_address') {
      const settleAddress = msg.text!;
      const { toCurrency, fromCurrency } = userState.details;

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
            `Rate: 1 ${quote.depositCoin.toUpperCase()} = ${rate} ${quote.settleCoin.toUpperCase()}`;
          
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