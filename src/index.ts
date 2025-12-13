import * as dotenv from 'dotenv';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { NlpManager } from 'node-nlp';

import * as fs from 'fs';
import WAValidator from 'multicoin-address-validator';
import { getQuote, createShift, pollShiftStatus, cancelShift, getAvailableCoins, getPairInfo } from './sideshift';
import { trainAndSaveNlpModel } from './nlp';
import express from 'express';

// Database and caching
import { prisma, getOrCreateUser, disconnectDatabase, updateUserLanguage, getUserLanguageFromDB } from './database';
import { getCached, setCached, CACHE_TTL, CacheKeys, cleanupExpiredCache } from './cache';

// Advanced features imports
import { getMarketTrend, getCurrentRate } from './marketData';
import { getFeeBreakdown } from './fees';
import { addAlert, checkAlerts, getUserAlerts, deleteAlert } from './alerts';
import { addSwap, getUserHistory, getSwapStats, recordShift, updateShiftStatus, formatSwapHistory, formatSwapStats, getShiftRecord } from './history';
import { detectNetwork } from './addressDetect';
import { predictInputError } from './errorPredict';
import { handleNaturalLanguage } from './aiAssistant';
import { generateQRCodeBuffer, formatCryptoURI, cleanupOldQRFiles } from './qrcode';

// New feature imports
import { log, logger } from './logger';
import { t, getUserLanguage, setUserLanguage, loadUserLanguage, getAvailableLanguages, getStatusText, Language } from './i18n';
import { getGlobalStats, getPopularPairs, getUserAnalytics, formatGlobalStats, formatPopularPairs, formatUserAnalytics } from './analytics';
import { getUserFavorites, addFavoritePair, removeFavoritePair, formatFavorites, formatFavoritesKeyboard, FavoritePair } from './favorites';
import { createLimitOrder, getUserLimitOrders, cancelLimitOrder, checkLimitOrders, formatLimitOrders } from './limitOrders';
import { createDCAOrder, getActiveDCAOrders, getUserDCAOrders, toggleDCAOrder, pauseDCAOrder, resumeDCAOrder, deleteDCAOrder, executeDCAOrders, formatDCAOrders, getFrequencyOptions } from './dca';
import { getReferralCode, applyReferralCode, getReferralStats, formatReferralInfo, parseReferralFromStart } from './referral';
import { getExplorerUrl, ShiftStatus } from './types/sideshift';
import { 
  getConversation, setConversation, updateConversation, clearConversation, 
  clearAllConversations, startSwapFlow, hasActiveConversation, UserConversation 
} from './conversation';

// Validation and status helpers
import { validateSwapAmount, validateAddress, formatValidationError, ValidationResult } from './validation';
import { formatCountdown, formatEnhancedStatus, formatStatusNotification, getStatusActionButtons, getNetworkETA, getQuoteCountdown } from './statusHelper';

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

    // 8. Start periodic cache cleanup
    setInterval(async () => {
      const cleaned = await cleanupExpiredCache();
      if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }, 60 * 60 * 1000); // Every hour

    // 9. Start periodic QR file cleanup
    setInterval(() => {
      const cleaned = cleanupOldQRFiles();
      if (cleaned > 0) console.log(`🧹 Cleaned ${cleaned} old QR code files`);
    }, 60 * 60 * 1000); // Every hour
    
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

  // Help message in multiple languages
  function getHelpMessage(lang: Language): string {
    const messages: Record<Language, string> = {
      en: `
👋 *Welcome to NeuraXchange!*

*💱 Swap Commands*
/swap - Start a new cryptocurrency swap
/price - Check exchange rates
/limits - View min/max limits for a pair
/status - Check status of a swap

*📊 Account & History*
/history - View your swap history
/myalerts - Manage price alerts
/alert - Set USD price alert (BTC, ETH, etc.)
/favorites - Quick access to favorite pairs

*🤖 Automation*
/limitorder - Set limit orders (swap at target price)
/dca - Dollar-cost averaging (recurring swaps)

*📈 Analytics*
/analytics - View your statistics
/stats - Global platform statistics
/popular - Most popular trading pairs

*⚙️ Settings*
/settings - Language & preferences
/referral - Earn rewards by inviting friends

*ℹ️ Info*
/coins - List available cryptocurrencies
/help - Show this help message

💡 Chat naturally! Try: "swap 0.1 BTC to ETH"
`,
      es: `
👋 *¡Bienvenido a NeuraXchange!*

*💱 Comandos de Intercambio*
/swap - Iniciar un nuevo intercambio
/price - Consultar tasas de cambio
/limits - Ver límites mín/máx para un par
/status - Ver estado de un intercambio

*📊 Cuenta & Historial*
/history - Ver tu historial de intercambios
/myalerts - Gestionar alertas de precio
/alert - Crear alerta de precio en USD
/favorites - Acceso rápido a pares favoritos

*🤖 Automatización*
/limitorder - Órdenes límite
/dca - Promedio de costo en dólares

*📈 Estadísticas*
/analytics - Ver tus estadísticas
/stats - Estadísticas globales
/popular - Pares más populares

*⚙️ Configuración*
/settings - Idioma y preferencias
/referral - Gana recompensas invitando amigos

*ℹ️ Información*
/coins - Lista de criptomonedas disponibles
/help - Mostrar este mensaje

💡 ¡Chatea naturalmente! Prueba: "swap 0.1 BTC to ETH"
`,
      fr: `
👋 *Bienvenue sur NeuraXchange!*

*💱 Commandes d'Échange*
/swap - Démarrer un nouvel échange
/price - Consulter les taux de change
/limits - Voir les limites min/max
/status - Vérifier le statut d'un échange

*📊 Compte & Historique*
/history - Voir votre historique d'échanges
/myalerts - Gérer les alertes de prix
/alert - Créer une alerte de prix en USD
/favorites - Accès rapide aux paires favorites

*🤖 Automatisation*
/limitorder - Ordres à cours limité
/dca - Achats programmés (DCA)

*📈 Statistiques*
/analytics - Voir vos statistiques
/stats - Statistiques globales
/popular - Paires les plus populaires

*⚙️ Paramètres*
/settings - Langue et préférences
/referral - Gagnez en parrainant des amis

*ℹ️ Informations*
/coins - Liste des cryptos disponibles
/help - Afficher ce message

💡 Discutez naturellement! Essayez: "swap 0.1 BTC to ETH"
`,
      ru: `
👋 *Добро пожаловать в NeuraXchange!*

*💱 Команды Обмена*
/swap - Начать новый обмен
/price - Проверить курсы
/limits - Лимиты мин/макс
/status - Статус обмена

*📊 Аккаунт & История*
/history - История обменов
/myalerts - Управление уведомлениями
/alert - Установить уведомление о цене
/favorites - Избранные пары

*🤖 Автоматизация*
/limitorder - Лимитные ордера
/dca - Регулярные покупки

*📈 Статистика*
/analytics - Ваша статистика
/stats - Глобальная статистика
/popular - Популярные пары

*⚙️ Настройки*
/settings - Язык и предпочтения
/referral - Приглашайте друзей

*ℹ️ Информация*
/coins - Доступные криптовалюты
/help - Показать это сообщение

💡 Общайтесь естественно! Попробуйте: "swap 0.1 BTC to ETH"
`,
      zh: `
👋 *欢迎使用 NeuraXchange!*

*💱 兑换命令*
/swap - 开始新的兑换
/price - 查看汇率
/limits - 查看最小/最大限额
/status - 查看兑换状态

*📊 账户和历史*
/history - 查看兑换历史
/myalerts - 管理价格提醒
/alert - 设置美元价格提醒
/favorites - 快速访问收藏

*🤖 自动化*
/limitorder - 限价单
/dca - 定投计划

*📈 统计*
/analytics - 您的统计数据
/stats - 全球统计
/popular - 热门交易对

*⚙️ 设置*
/settings - 语言和偏好
/referral - 邀请好友获得奖励

*ℹ️ 信息*
/coins - 可用加密货币列表
/help - 显示此帮助信息

💡 自然对话！试试: "swap 0.1 BTC to ETH"
`
    };
    return messages[lang] || messages.en;
  }

  // /start command with referral support and onboarding
  bot.onText(/\/start(?:\s+(.+))?/, async (msg: Message, match) => {
    const chatId = msg.chat.id;
    log.userCommand(chatId, '/start');
    
    // Register user in database
    const user = await getOrCreateUser(chatId, msg.from?.username, msg.from?.first_name, msg.from?.last_name);
    
    // Load user's saved language
    if (user.language) {
      loadUserLanguage(chatId, user.language);
    }
    
    // Check for referral code
    if (match && match[1]) {
      const refCode = parseReferralFromStart(match[1]);
      if (refCode) {
        const result = await applyReferralCode(chatId, refCode);
        if (result.success) {
          bot.sendMessage(chatId, `🎉 Referral code applied! You were referred by another user.`);
        }
      }
    }
    
    const lang = getUserLanguage(chatId);
    const firstName = msg.from?.first_name || 'there';
    
    // Brief welcome message for all users
    const welcomeMessage = `👋 *Welcome${user.isNewUser ? '' : ' back'}, ${firstName}!*

🔄 *NeuraXchange* - Your AI-powered crypto swap assistant

Swap 100+ cryptocurrencies instantly with the best rates. Set alerts, automate trades with DCA & limit orders, all in one place.

💡 _Type naturally: "Swap 0.1 ETH to USDT"_`;

    await bot.sendMessage(chatId, welcomeMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Swap', callback_data: 'start_swap' },
            { text: '💰 Price', callback_data: 'cmd_price' },
            { text: '📊 Status', callback_data: 'cmd_status' }
          ],
          [
            { text: '🔔 Alerts', callback_data: 'cmd_alerts' },
            { text: '⭐ Favorites', callback_data: 'cmd_favorites' },
            { text: '📜 History', callback_data: 'cmd_history' }
          ],
          [
            { text: '📈 Limit Order', callback_data: 'new_limit_order' },
            { text: '🔁 DCA', callback_data: 'new_dca_order' }
          ],
          [
            { text: '📊 Analytics', callback_data: 'cmd_analytics' },
            { text: '🎁 Referral', callback_data: 'referral' }
          ],
          [
            { text: '🌐 Language', callback_data: 'settings_language' },
            { text: '❓ Help', callback_data: 'show_help' }
          ]
        ]
      }
    });
  });

  bot.onText(/\/help$/, (msg: Message) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    bot.sendMessage(chatId, getHelpMessage(lang), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/swap/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `Let's start your swap! 🔄\n\nChoose the coin you want to swap FROM:`;
    const coins = await getAvailableCoins();
    const keyboard = [
      [{ text: '💵 USDT', callback_data: 'from_USDT' }, { text: '💵 USDC', callback_data: 'from_USDC' }],
      [{ text: '₿ BTC', callback_data: 'from_BTC' }, { text: 'Ξ ETH', callback_data: 'from_ETH' }],
      [{ text: '◎ SOL', callback_data: 'from_SOL' }, { text: '◈ DAI', callback_data: 'from_DAI' }],
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

  bot.onText(/\/alert$/, async (msg: Message) => {
    const chatId = msg.chat.id;
    // Default to USD (USDT) alerts - much simpler for users!
    const keyboard = [
      [{ text: '₿ BTC/USD', callback_data: 'alert_usd_BTC' }, { text: 'Ξ ETH/USD', callback_data: 'alert_usd_ETH' }],
      [{ text: '◎ SOL/USD', callback_data: 'alert_usd_SOL' }, { text: '◈ XRP/USD', callback_data: 'alert_usd_XRP' }],
      [{ text: '🐕 DOGE/USD', callback_data: 'alert_usd_DOGE' }, { text: '🔗 LINK/USD', callback_data: 'alert_usd_LINK' }],
      [{ text: '⚙️ Advanced (custom pair)', callback_data: 'alert_advanced' }]
    ];
    bot.sendMessage(chatId, '🔔 *Set Price Alert*\n\nGet notified when a coin reaches your target price in USD!\n\nSelect a coin:', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    userConversations[chatId] = { state: 'setting_alert_from', details: { toCoin: 'USDT' } };
  });

  // === NEW COMMAND: /myalerts - View active price alerts ===
  bot.onText(/\/myalerts/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      const alerts = await getUserAlerts(chatId);
      
      if (alerts.length === 0) {
        bot.sendMessage(chatId, "📭 You don't have any active alerts.\n\nUse /alert to create one!", {
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Create Alert', callback_data: 'new_alert' }]]
          }
        });
        return;
      }

      let message = "🔔 *Your Active Alerts*\n\n";
      const keyboard: any[] = [];

      alerts.forEach((alert: any, index: number) => {
        const emoji = alert.direction === 'above' ? '⬆️' : '⬇️';
        const isUsdAlert = alert.toCoin.toUpperCase() === 'USDT' || alert.toCoin.toUpperCase() === 'USDC';
        const pairDisplay = isUsdAlert 
          ? `${alert.fromCoin.toUpperCase()}/USD` 
          : `${alert.fromCoin.toUpperCase()}/${alert.toCoin.toUpperCase()}`;
        const rateDisplay = isUsdAlert 
          ? `$${parseFloat(alert.targetRate).toLocaleString()}` 
          : alert.targetRate;
        
        message += `${index + 1}. ${emoji} *${pairDisplay}*\n`;
        message += `   Trigger: ${alert.direction} ${rateDisplay}\n`;
        message += `   Created: ${new Date(alert.createdAt).toLocaleDateString()}\n\n`;
        
        keyboard.push([{ text: `🗑️ Delete Alert #${index + 1}`, callback_data: `delete_alert_${alert.id}` }]);
      });

      keyboard.push([{ text: '➕ Create New Alert', callback_data: 'new_alert' }]);

      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      bot.sendMessage(chatId, "⚠️ Error fetching alerts. Please try again.");
    }
  });

  // === NEW COMMAND: /history - View swap history ===
  bot.onText(/\/history/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      bot.sendMessage(chatId, "⏳ Loading your swap history...");
      
      const swaps = await getUserHistory(chatId, 10);
      const stats = await getSwapStats(chatId);
      
      const historyMessage = formatSwapHistory(swaps);
      const statsMessage = stats ? formatSwapStats(stats) : '';
      
      const fullMessage = `${historyMessage}\n${statsMessage}`;
      
      bot.sendMessage(chatId, fullMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔁 New Swap', callback_data: 'swap_again' }],
            [{ text: '📊 Full Stats', callback_data: 'full_stats' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error fetching history:', error);
      bot.sendMessage(chatId, "⚠️ Error fetching history. Please try again.");
    }
  });

  // === NEW COMMAND: /limits - View min/max limits for a pair ===
  bot.onText(/\/limits$/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const popular = ['BTC', 'ETH', 'USDT', 'USDC', 'SOL', 'DAI'];
    const keyboard = [
      popular.slice(0, 3).map(c => ({ text: c, callback_data: `limits_from_${c}` })),
      popular.slice(3, 6).map(c => ({ text: c, callback_data: `limits_from_${c}` })),
      [{ text: '🔍 More coins...', callback_data: 'limits_from_more' }]
    ];
    bot.sendMessage(chatId, '📊 Check limits for which pair?\n\nSelect the FROM coin:', {
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  bot.onText(/\/limits (.+) to (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match) return;

    const from = parseCoinAndNetwork(match[1]);
    const to = parseCoinAndNetwork(match[2]);

    try {
      bot.sendMessage(chatId, `⏳ Fetching limits for ${from.coin.toUpperCase()}/${to.coin.toUpperCase()}...`);
      
      const pairInfo = await getPairInfo(from.coin, to.coin, from.network, to.network);
      
      const message = `📊 *Limits for ${pairInfo.depositCoin.toUpperCase()} → ${pairInfo.settleCoin.toUpperCase()}*

📉 Minimum: ${pairInfo.min} ${pairInfo.depositCoin.toUpperCase()}
📈 Maximum: ${pairInfo.max} ${pairInfo.depositCoin.toUpperCase()}
💱 Rate: 1 ${pairInfo.depositCoin.toUpperCase()} ≈ ${pairInfo.rate} ${pairInfo.settleCoin.toUpperCase()}`;

      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '🔁 Swap Now', callback_data: 'swap_again' }]]
        }
      });
    } catch (error) {
      bot.sendMessage(chatId, `⚠️ Could not fetch limits for that pair. Check the coin tickers and try again.`);
    }
  });

  // === NEW COMMAND: /status - Check swap status ===
  bot.onText(/\/status$/, async (msg: Message) => {
    const chatId = msg.chat.id;
    
    // Check if user has an active swap in conversation
    const userState = userConversations[chatId];
    if (userState && userState.shiftId) {
      try {
        const status = await pollShiftStatus(userState.shiftId);
        const message = formatStatusMessage(status);
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        bot.sendMessage(chatId, "⚠️ Could not fetch status. Use `/status <shift_id>` to check a specific swap.", { parse_mode: 'Markdown' });
      }
      return;
    }

    // Check recent swaps from history
    const swaps = await getUserHistory(chatId, 5);
    if (swaps.length === 0) {
      bot.sendMessage(chatId, "📭 No recent swaps found.\n\nUse `/status <shift_id>` to check a specific swap, or /swap to start a new one.", { parse_mode: 'Markdown' });
      return;
    }

    const keyboard = swaps.map((swap: any) => [{
      text: `${swap.fromCoin.toUpperCase()}→${swap.toCoin.toUpperCase()} (${swap.status})`,
      callback_data: `check_status_${swap.shiftId}`
    }]);

    bot.sendMessage(chatId, "📋 Select a swap to check its status:", {
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  bot.onText(/\/status (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match || !match[1]) return;

    const shiftId = match[1].trim();
    
    try {
      bot.sendMessage(chatId, `⏳ Checking status for shift ${shiftId}...`);
      const status = await pollShiftStatus(shiftId);
      const message = formatStatusMessage(status);
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, `⚠️ Could not find a swap with ID: \`${shiftId}\``, { parse_mode: 'Markdown' });
    }
  });

  // Helper function to format status message with explorer links
  function formatStatusMessage(status: any): string {
    const statusEmoji: { [key: string]: string } = {
      'pending': '⏳',
      'waiting': '📥',
      'processing': '🔄',
      'settling': '📤',
      'complete': '✅',
      'refunded': '↩️',
      'expired': '⏰',
      'rejected': '❌'
    };

    const emoji = statusEmoji[status.status] || '❓';
    
    // Build status description
    const statusDescriptions: { [key: string]: string } = {
      'pending': 'Waiting to start...',
      'waiting': 'Waiting for your deposit',
      'processing': 'Processing your swap...',
      'settling': 'Sending funds to your wallet',
      'complete': 'Swap completed! 🎉',
      'refunded': 'Funds have been refunded',
      'expired': 'This swap has expired',
      'rejected': 'This swap was rejected'
    };
    
    const description = statusDescriptions[status.status] || '';

    // Calculate ETA for processing states
    let etaText = '';
    if (['processing', 'settling'].includes(status.status) && status.settleNetwork) {
      const eta = getNetworkETA(status.settleNetwork);
      etaText = `⏱️ *ETA:* ${eta.minMinutes}-${eta.maxMinutes} minutes\n`;
    }

    // Build explorer links
    let explorerLinks = '';
    if (status.depositHash && status.depositNetwork) {
      const txUrl = getExplorerUrl(status.depositNetwork, 'tx', status.depositHash);
      if (txUrl) {
        explorerLinks += `🔗 [View Deposit TX](${txUrl})\n`;
      }
    }
    if (status.settleHash && status.settleNetwork) {
      const txUrl = getExplorerUrl(status.settleNetwork, 'tx', status.settleHash);
      if (txUrl) {
        explorerLinks += `🔗 [View Settlement TX](${txUrl})\n`;
      }
    }
    
    // Build progress bar for processing states
    let progressBar = '';
    if (['waiting', 'processing', 'settling', 'complete'].includes(status.status)) {
      const stages = ['waiting', 'processing', 'settling', 'complete'];
      const currentIndex = stages.indexOf(status.status);
      const filled = '▓';
      const empty = '░';
      const progress = stages.map((_, i) => i <= currentIndex ? filled : empty).join('');
      progressBar = `\n📊 Progress: ${progress} ${Math.round((currentIndex + 1) / stages.length * 100)}%`;
    }

    return `${emoji} *Swap Status: ${status.status.charAt(0).toUpperCase() + status.status.slice(1)}*
${description}

🆔 ID: \`${status.id}\`

📥 Deposit: \`${status.depositAmount || 'N/A'}\` ${status.depositCoin?.toUpperCase() || ''}
📤 Receive: \`${status.settleAmount || 'N/A'}\` ${status.settleCoin?.toUpperCase() || ''}

${etaText}${status.depositAddress ? `💳 Deposit Address:\n\`${status.depositAddress}\`\n` : ''}${status.settleAddress ? `📬 Settle Address:\n\`${status.settleAddress.substring(0, 20)}...\`\n` : ''}${explorerLinks}${progressBar}

⏱️ Created: ${new Date(status.createdAt).toLocaleString()}`;
  }

  // === NEW COMMANDS ===

  // /settings - Language and preferences
  bot.onText(/\/settings/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const currentLang = getUserLanguage(chatId);
    const languages = getAvailableLanguages();
    
    const keyboard = languages.map(lang => [{
      text: `${lang.flag} ${lang.name}${currentLang === lang.code ? ' ✓' : ''}`,
      callback_data: `set_lang_${lang.code}`
    }]);
    
    bot.sendMessage(chatId, '⚙️ *Settings*\n\n🌐 Select your language:', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  // /analytics - User statistics
  bot.onText(/\/analytics/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      bot.sendMessage(chatId, '⏳ Loading your analytics...');
      const stats = await getUserAnalytics(chatId);
      if (!stats) {
        bot.sendMessage(chatId, '📊 No analytics data yet. Complete a swap to see your stats!');
        return;
      }
      bot.sendMessage(chatId, formatUserAnalytics(stats), { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, '⚠️ Error loading analytics.');
    }
  });

  // /stats - Global platform statistics
  bot.onText(/\/stats/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      bot.sendMessage(chatId, '⏳ Loading global statistics...');
      const stats = await getGlobalStats();
      bot.sendMessage(chatId, formatGlobalStats(stats), { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, '⚠️ Error loading statistics.');
    }
  });

  // /popular - Most popular trading pairs
  bot.onText(/\/popular/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      const pairs = await getPopularPairs(10);
      bot.sendMessage(chatId, formatPopularPairs(pairs), { parse_mode: 'Markdown' });
    } catch (error) {
      bot.sendMessage(chatId, '⚠️ Error loading popular pairs.');
    }
  });

  // /favorites - Quick access to favorite pairs
  bot.onText(/\/favorites/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      const favorites = await getUserFavorites(chatId);
      const message = formatFavorites(favorites);
      
      const keyboard: any[] = favorites.map((fav, i) => [{
        text: `🔄 ${fav.fromCoin.toUpperCase()} → ${fav.toCoin.toUpperCase()}`,
        callback_data: `quick_swap_${fav.fromCoin}_${fav.toCoin}`
      }]);
      keyboard.push([{ text: '➕ Add after next swap', callback_data: 'noop' }]);
      
      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      bot.sendMessage(chatId, '⚠️ Error loading favorites.');
    }
  });

  // /referral - Referral program
  bot.onText(/\/referral/, async (msg: Message) => {
    const chatId = msg.chat.id;
    try {
      const stats = await getReferralStats(chatId);
      const botInfo = await bot.getMe();
      const message = formatReferralInfo(stats, botInfo.username || 'NeuraXchangeBot');
      
      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📋 Copy Code', callback_data: `copy_ref_${stats.referralCode}` },
            { text: '📤 Share', switch_inline_query: `Join NeuraXchange with my code: ${stats.referralCode}` }
          ]]
        }
      });
    } catch (error) {
      bot.sendMessage(chatId, '⚠️ Error loading referral info.');
    }
  });

  // /limitorder - Set limit orders
  bot.onText(/\/limitorder/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const orders = getUserLimitOrders(chatId);
    
    if (orders.length > 0) {
      const message = formatLimitOrders(orders);
      const keyboard = orders.map((order, i) => [{
        text: `❌ Cancel Order #${i + 1}`,
        callback_data: `cancel_limit_${order.id}`
      }]);
      keyboard.push([{ text: '➕ Create New Limit Order', callback_data: 'new_limit_order' }]);
      
      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      bot.sendMessage(chatId, 
        `📋 *Limit Orders*\n\n` +
        `Set a limit order to automatically swap when a target price is reached.\n\n` +
        `Example: Swap 0.1 BTC to ETH when the rate goes above 20.\n\n` +
        `Tap below to create a new limit order:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Create Limit Order', callback_data: 'new_limit_order' }]]
          }
        }
      );
    }
  });

  // /dca - Dollar-cost averaging
  bot.onText(/\/dca/, async (msg: Message) => {
    const chatId = msg.chat.id;
    const orders = getActiveDCAOrders(chatId);
    
    if (orders.length > 0) {
      const message = formatDCAOrders(orders);
      const keyboard = orders.map((order, i) => [
        { text: order.isActive ? `⏸️ Pause #${i + 1}` : `▶️ Resume #${i + 1}`, callback_data: `toggle_dca_${order.id}` },
        { text: `🗑️ Delete #${i + 1}`, callback_data: `delete_dca_${order.id}` }
      ]);
      keyboard.push([{ text: '➕ Create New DCA Order', callback_data: 'new_dca_order' }]);
      
      bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      bot.sendMessage(chatId,
        `🔄 *Dollar-Cost Averaging (DCA)*\n\n` +
        `Automate your crypto investing with recurring swaps!\n\n` +
        `Set up automatic swaps on a schedule:\n` +
        `• ⏰ Hourly\n` +
        `• 📅 Daily\n` +
        `• 📆 Weekly\n` +
        `• 🗓️ Monthly\n\n` +
        `Tap below to set up DCA:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Create DCA Order', callback_data: 'new_dca_order' }]]
          }
        }
      );
    }
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

    // === Onboarding button handlers ===
    if (data === 'start_swap') {
      const welcomeMessage = `Let's start your swap! 🔄\n\nChoose the coin you want to swap FROM:`;
      const keyboard = [
        [{ text: '💵 USDT', callback_data: 'from_USDT' }, { text: '💵 USDC', callback_data: 'from_USDC' }],
        [{ text: '₿ BTC', callback_data: 'from_BTC' }, { text: 'Ξ ETH', callback_data: 'from_ETH' }],
        [{ text: '◎ SOL', callback_data: 'from_SOL' }, { text: '◈ DAI', callback_data: 'from_DAI' }],
        [{ text: '🔍 More coins...', callback_data: 'from_more' }]
      ];
      bot.sendMessage(chatId, welcomeMessage, {
        reply_markup: { inline_keyboard: keyboard }
      });
      userConversations[chatId] = { state: 'selecting_from_coin', details: {} };
      return;
    }

    if (data === 'show_help') {
      const lang = getUserLanguage(chatId);
      bot.sendMessage(chatId, getHelpMessage(lang), { parse_mode: 'Markdown' });
      return;
    }

    if (data === 'settings_language') {
      const keyboard = [
        [{ text: '🇺🇸 English', callback_data: 'set_lang_en' }, { text: '🇪🇸 Español', callback_data: 'set_lang_es' }],
        [{ text: '🇫🇷 Français', callback_data: 'set_lang_fr' }, { text: '🇷🇺 Русский', callback_data: 'set_lang_ru' }],
        [{ text: '🇨🇳 中文', callback_data: 'set_lang_zh' }]
      ];
      bot.sendMessage(chatId, '🌐 Choose your preferred language:', {
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    if (data === 'referral') {
      try {
        const stats = await getReferralStats(chatId);
        const botInfo = await bot.getMe();
        const refInfo = formatReferralInfo(stats, botInfo.username || '');
        bot.sendMessage(chatId, refInfo, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📤 Share Referral Link', callback_data: 'share_referral' }],
              [{ text: '🏠 Back to Menu', callback_data: 'show_help' }]
            ]
          }
        });
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Could not load referral information. Try /referral command.');
      }
      return;
    }

    if (data === 'share_referral') {
      const code = await getReferralCode(chatId);
      const botUsername = (await bot.getMe()).username;
      const referralLink = `https://t.me/${botUsername}?start=ref_${code}`;
      bot.sendMessage(chatId, `📤 *Share your referral link:*\n\n\`${referralLink}\`\n\nShare this with friends to earn rewards when they swap!`, { parse_mode: 'Markdown' });
      return;
    }

    // === Command button handlers (from /start menu) ===
    if (data === 'cmd_price') {
      bot.sendMessage(chatId, '💰 *Check Price*\n\nEnter a pair to check the rate:\n\nExample: `/price BTC USDT` or `/price ETH SOL`', { parse_mode: 'Markdown' });
      return;
    }

    if (data === 'cmd_status') {
      // Check recent swaps from history
      const swaps = await getUserHistory(chatId, 5);
      if (swaps.length === 0) {
        bot.sendMessage(chatId, "📭 No recent swaps found.\n\nUse `/status <shift_id>` to check a specific swap, or tap 🔄 Swap to start a new one.", { parse_mode: 'Markdown' });
        return;
      }
      const keyboard = swaps.map((swap: any) => [{
        text: `${swap.fromCoin.toUpperCase()}→${swap.toCoin.toUpperCase()} (${swap.status})`,
        callback_data: `check_status_${swap.shiftId}`
      }]);
      bot.sendMessage(chatId, "📋 *Your Recent Swaps*\n\nSelect a swap to check its status:", {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    if (data === 'cmd_alerts') {
      const alerts = await getUserAlerts(chatId);
      if (!alerts || alerts.length === 0) {
        bot.sendMessage(chatId, '🔔 *Price Alerts*\n\nNo active alerts. Create one to get notified when prices hit your target!', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '➕ New Alert', callback_data: 'new_alert' }]]
          }
        });
        return;
      }
      const alertList = alerts.map((a: any, i: number) => 
        `${i + 1}. ${a.from.toUpperCase()}/${a.to.toUpperCase()} ${a.direction === 'above' ? '⬆️' : '⬇️'} ${a.targetRate}`
      ).join('\n');
      bot.sendMessage(chatId, `🔔 *Your Alerts*\n\n${alertList}`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ New Alert', callback_data: 'new_alert' }],
            [{ text: '🗑️ Manage Alerts', callback_data: 'view_alerts' }]
          ]
        }
      });
      return;
    }

    if (data === 'cmd_favorites') {
      const favorites = await getUserFavorites(chatId);
      if (!favorites || favorites.length === 0) {
        bot.sendMessage(chatId, '⭐ *Favorite Pairs*\n\nNo favorites yet! Complete a swap and add it to favorites for quick access.', { parse_mode: 'Markdown' });
        return;
      }
      const keyboard = await formatFavoritesKeyboard(chatId);
      bot.sendMessage(chatId, '⭐ *Your Favorite Pairs*\n\nSelect a pair to quick swap:', {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      return;
    }

    if (data === 'cmd_history') {
      const history = await getUserHistory(chatId, 10);
      if (!history || history.length === 0) {
        bot.sendMessage(chatId, '📜 *Swap History*\n\nNo swap history yet. Start your first swap!', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🔄 Start Swap', callback_data: 'start_swap' }]]
          }
        });
        return;
      }
      const formatted = formatSwapHistory(history);
      bot.sendMessage(chatId, `📜 *Your Swap History*\n\n${formatted}`, { parse_mode: 'Markdown' });
      return;
    }

    if (data === 'cmd_analytics') {
      const stats = await getSwapStats(chatId);
      if (!stats) {
        bot.sendMessage(chatId, '📊 *Analytics*\n\nNo statistics yet. Complete some swaps to see your analytics!', { parse_mode: 'Markdown' });
        return;
      }
      bot.sendMessage(chatId, formatSwapStats(stats), { parse_mode: 'Markdown' });
      return;
    }

    // === NEW: Handle new_alert button ===
    if (data === 'new_alert') {
      // Default to USD (USDT) alerts - simpler for users!
      const keyboard = [
        [{ text: '₿ BTC/USD', callback_data: 'alert_usd_BTC' }, { text: 'Ξ ETH/USD', callback_data: 'alert_usd_ETH' }],
        [{ text: '◎ SOL/USD', callback_data: 'alert_usd_SOL' }, { text: '◈ XRP/USD', callback_data: 'alert_usd_XRP' }],
        [{ text: '🐕 DOGE/USD', callback_data: 'alert_usd_DOGE' }, { text: '🔗 LINK/USD', callback_data: 'alert_usd_LINK' }],
        [{ text: '⚙️ Advanced (custom pair)', callback_data: 'alert_advanced' }]
      ];
      bot.sendMessage(chatId, '🔔 *Set Price Alert*\n\nGet notified when a coin reaches your target price in USD!\n\nSelect a coin:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      userConversations[chatId] = { state: 'setting_alert_from', details: { toCoin: 'USDT' } };
      return;
    }

    // === Handle USD alert quick setup (simplified flow) ===
    if (data && data.startsWith('alert_usd_')) {
      const fromCoin = data.replace('alert_usd_', '');
      userConversations[chatId] = { 
        state: 'setting_alert_direction', 
        details: { fromCoin, toCoin: 'USDT' } 
      };
      
      // Fetch current price to show context
      try {
        const quote = await getQuote({
          depositCoin: fromCoin.toLowerCase(),
          settleCoin: 'usdt',
          depositAmount: '1'
        });
        const currentPrice = parseFloat(quote.settleAmount).toFixed(2);
        
        bot.editMessageText(
          `💰 *${fromCoin}/USD Alert*\n\n` +
          `Current price: $${currentPrice}\n\n` +
          `Notify me when the price is:`,
          {
            chat_id: chatId,
            message_id: originalMessageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬆️ Above (price goes up)', callback_data: 'alert_dir_above' }, { text: '⬇️ Below (price drops)', callback_data: 'alert_dir_below' }],
                [{ text: '« Back', callback_data: 'new_alert' }]
              ]
            }
          }
        );
      } catch (error) {
        bot.editMessageText(
          `💰 *${fromCoin}/USD Alert*\n\n` +
          `Notify me when the price is:`,
          {
            chat_id: chatId,
            message_id: originalMessageId,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⬆️ Above', callback_data: 'alert_dir_above' }, { text: '⬇️ Below', callback_data: 'alert_dir_below' }],
                [{ text: '« Back', callback_data: 'new_alert' }]
              ]
            }
          }
        );
      }
      return;
    }

    // === Handle advanced alert (custom pair) ===
    if (data === 'alert_advanced') {
      const popular = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK'];
      const keyboard = [
        popular.slice(0, 3).map(c => ({ text: c, callback_data: `alert_from_${c}` })),
        popular.slice(3, 6).map(c => ({ text: c, callback_data: `alert_from_${c}` })),
        [{ text: '🔍 More coins...', callback_data: 'alert_from_more' }],
        [{ text: '« Back to USD alerts', callback_data: 'new_alert' }]
      ];
      bot.editMessageText('⚙️ *Advanced Alert Setup*\n\nSelect the base coin (FROM):', {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      userConversations[chatId] = { state: 'setting_alert_from', details: {} };
      return;
    }

    // === NEW: Handle delete_alert button ===
    if (data && data.startsWith('delete_alert_')) {
      const alertId = parseInt(data.replace('delete_alert_', ''));
      try {
        const deleted = await deleteAlert(chatId, alertId);
        if (deleted) {
          bot.editMessageText('✅ Alert deleted successfully!', {
            chat_id: chatId,
            message_id: originalMessageId,
            reply_markup: {
              inline_keyboard: [[
                { text: '📋 View Remaining Alerts', callback_data: 'view_alerts' },
                { text: '➕ New Alert', callback_data: 'new_alert' }
              ]]
            }
          });
        } else {
          bot.sendMessage(chatId, '⚠️ Could not delete alert. It may have already been removed.');
        }
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Error deleting alert.');
      }
      return;
    }

    // === NEW: Handle view_alerts button ===
    if (data === 'view_alerts') {
      const alerts = await getUserAlerts(chatId);
      if (alerts.length === 0) {
        bot.editMessageText("📭 You don't have any active alerts.", {
          chat_id: chatId,
          message_id: originalMessageId,
          reply_markup: {
            inline_keyboard: [[{ text: '➕ Create Alert', callback_data: 'new_alert' }]]
          }
        });
        return;
      }
      let message = "🔔 *Your Active Alerts*\n\n";
      const keyboard: any[] = [];
      alerts.forEach((alert: any, index: number) => {
        const emoji = alert.direction === 'above' ? '⬆️' : '⬇️';
        message += `${index + 1}. ${emoji} *${alert.fromCoin.toUpperCase()}/${alert.toCoin.toUpperCase()}* - ${alert.direction} ${alert.targetRate}\n`;
        keyboard.push([{ text: `🗑️ Delete #${index + 1}`, callback_data: `delete_alert_${alert.id}` }]);
      });
      keyboard.push([{ text: '➕ New Alert', callback_data: 'new_alert' }]);
      bot.editMessageText(message, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    // === NEW: Handle limits flow ===
    if (data && data.startsWith('limits_from_')) {
      const fromCoin = data.replace('limits_from_', '');
      if (fromCoin === 'more') {
        const coins = await getAvailableCoins();
        const all = coins.map((c: any) => c.coin.toUpperCase()).sort();
        const rows = [];
        for (let i = 0; i < all.length; i += 3) {
          rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `limits_from_${c}` })));
        }
        bot.editMessageText('Select FROM coin for limits:', {
          chat_id: chatId,
          message_id: originalMessageId,
          reply_markup: { inline_keyboard: rows }
        });
        return;
      }
      const coins = await getAvailableCoins();
      const all = coins.map((c: any) => c.coin.toUpperCase()).filter((c: string) => c !== fromCoin).sort();
      const rows = [];
      for (let i = 0; i < all.length; i += 3) {
        rows.push(all.slice(i, i + 3).map((c: string) => ({ text: c, callback_data: `limits_to_${fromCoin}_${c}` })));
      }
      bot.editMessageText(`Limits for *${fromCoin}* to which coin?`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows }
      });
      return;
    }

    if (data && data.startsWith('limits_to_')) {
      const parts = data.replace('limits_to_', '').split('_');
      const fromCoin = parts[0];
      const toCoin = parts[1];
      try {
        bot.editMessageText(`⏳ Fetching limits for ${fromCoin}/${toCoin}...`, {
          chat_id: chatId,
          message_id: originalMessageId
        });
        const pairInfo = await getPairInfo(fromCoin.toLowerCase(), toCoin.toLowerCase());
        const message = `📊 *Limits for ${fromCoin} → ${toCoin}*

📉 Minimum: ${pairInfo.min} ${fromCoin}
📈 Maximum: ${pairInfo.max} ${fromCoin}
💱 Rate: 1 ${fromCoin} ≈ ${pairInfo.rate} ${toCoin}`;
        bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '🔁 Swap This Pair', callback_data: `from_${fromCoin}` }]]
          }
        });
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Could not fetch limits for this pair.');
      }
      return;
    }

    // === NEW: Handle check_status button ===
    if (data && data.startsWith('check_status_')) {
      const shiftId = data.replace('check_status_', '');
      try {
        const status = await pollShiftStatus(shiftId);
        const message = formatStatusMessage(status);
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Could not fetch status for this swap.');
      }
      return;
    }

    // === NEW: Handle view_limits button (shows min/max for pair) ===
    if (data && data.startsWith('view_limits_')) {
      const parts = data.replace('view_limits_', '').split('_');
      const [fromCoin, toCoin] = parts;
      try {
        const pairInfo = await getPairInfo(fromCoin, toCoin);
        const limitMessage = `📊 *${fromCoin.toUpperCase()} → ${toCoin.toUpperCase()} Limits*\n\n` +
          `📉 Minimum: \`${pairInfo.min}\` ${fromCoin.toUpperCase()}\n` +
          `📈 Maximum: \`${pairInfo.max}\` ${fromCoin.toUpperCase()}\n\n` +
          `💱 Current Rate: \`${pairInfo.rate}\`\n\n` +
          `💡 _Enter an amount within these limits to proceed._`;
        
        bot.sendMessage(chatId, limitMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔁 Try Again', callback_data: 'back_amount' }]
            ]
          }
        });
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Could not fetch pair limits. Please try again.');
      }
      return;
    }

    // === NEW: Handle full_stats button ===
    if (data === 'full_stats') {
      const stats = await getSwapStats(chatId);
      if (!stats) {
        bot.sendMessage(chatId, "📊 No statistics available yet. Complete a swap first!");
        return;
      }
      bot.sendMessage(chatId, formatSwapStats(stats), { parse_mode: 'Markdown' });
      return;
    }

    // === FAVORITES CALLBACKS ===
    if (data && data.startsWith('fav_add_')) {
      const [fromCoin, toCoin] = data.replace('fav_add_', '').split('_');
      try {
        await addFavoritePair(chatId, fromCoin, toCoin);
        bot.answerCallbackQuery(callbackQuery.id, { text: `⭐ Added ${fromCoin}/${toCoin} to favorites!` });
      } catch (error) {
        bot.answerCallbackQuery(callbackQuery.id, { text: '⚠️ Could not add favorite' });
      }
      return;
    }

    if (data && data.startsWith('fav_remove_')) {
      const favId = parseInt(data.replace('fav_remove_', ''));
      try {
        await removeFavoritePair(chatId, favId);
        const keyboard = await formatFavoritesKeyboard(chatId);
        bot.editMessageText('⭐ *Your Favorite Pairs*\n\nSelect a pair to quick swap:', {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Could not remove favorite.');
      }
      return;
    }

    if (data && data.startsWith('fav_swap_')) {
      const [fromCoin, toCoin] = data.replace('fav_swap_', '').split('_');
      userConversations[chatId] = { 
        state: 'selecting_to_network', 
        details: { fromCoin, toCoin } 
      };
      bot.editMessageText(`🔁 Quick swap: *${fromCoin}* → *${toCoin}*\n\nEnter the amount to swap:`, {
        chat_id: chatId,
        message_id: originalMessageId,
        parse_mode: 'Markdown'
      });
      userConversations[chatId].state = 'awaiting_amount';
      return;
    }

    // === NEW DCA ORDER SETUP ===
    if (data === 'new_dca_order') {
      const keyboard = [
        [{ text: '💵 USDT', callback_data: 'dca_from_USDT' }, { text: '💵 USDC', callback_data: 'dca_from_USDC' }],
        [{ text: '₿ BTC', callback_data: 'dca_from_BTC' }, { text: 'Ξ ETH', callback_data: 'dca_from_ETH' }],
        [{ text: '« Back', callback_data: 'dca_list' }]
      ];
      bot.editMessageText(
        `🔄 *Create DCA Order*\n\n` +
        `Select the coin you want to swap FROM:`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      userConversations[chatId] = { state: 'dca_selecting_from', details: {} };
      return;
    }

    if (data && data.startsWith('dca_from_')) {
      const fromCoin = data.replace('dca_from_', '');
      const keyboard = [
        [{ text: '💵 USDT', callback_data: 'dca_to_USDT' }, { text: '💵 USDC', callback_data: 'dca_to_USDC' }],
        [{ text: '₿ BTC', callback_data: 'dca_to_BTC' }, { text: 'Ξ ETH', callback_data: 'dca_to_ETH' }],
        [{ text: '« Back', callback_data: 'new_dca_order' }]
      ];
      userConversations[chatId] = { state: 'dca_selecting_to', details: { fromCoin } };
      bot.editMessageText(
        `🔄 *Create DCA Order*\n\n` +
        `From: ${fromCoin}\n\n` +
        `Select the coin you want to swap TO:`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      return;
    }

    if (data && data.startsWith('dca_to_')) {
      const toCoin = data.replace('dca_to_', '');
      const fromCoin = userState?.details?.fromCoin || 'BTC';
      const keyboard = [
        [{ text: '⏰ Hourly', callback_data: 'dca_freq_hourly' }, { text: '📅 Daily', callback_data: 'dca_freq_daily' }],
        [{ text: '📆 Weekly', callback_data: 'dca_freq_weekly' }, { text: '🗓️ Monthly', callback_data: 'dca_freq_monthly' }],
        [{ text: '« Back', callback_data: `dca_from_${fromCoin}` }]
      ];
      userConversations[chatId] = { state: 'dca_selecting_freq', details: { fromCoin, toCoin } };
      bot.editMessageText(
        `🔄 *Create DCA Order*\n\n` +
        `From: ${fromCoin}\n` +
        `To: ${toCoin}\n\n` +
        `Select how often to swap:`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      return;
    }

    if (data && data.startsWith('dca_freq_')) {
      const frequency = data.replace('dca_freq_', '') as 'hourly' | 'daily' | 'weekly' | 'monthly';
      const { fromCoin, toCoin } = userState?.details || { fromCoin: 'BTC', toCoin: 'USDT' };
      userConversations[chatId] = { 
        state: 'dca_entering_amount', 
        details: { fromCoin, toCoin, frequency } 
      };
      bot.editMessageText(
        `🔄 *Create DCA Order*\n\n` +
        `From: ${fromCoin}\n` +
        `To: ${toCoin}\n` +
        `Frequency: ${frequency}\n\n` +
        `Enter the amount of ${fromCoin} to swap each time:`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    // === NEW LIMIT ORDER SETUP ===
    if (data === 'new_limit_order') {
      const keyboard = [
        [{ text: '₿ BTC', callback_data: 'limit_from_BTC' }, { text: 'Ξ ETH', callback_data: 'limit_from_ETH' }],
        [{ text: '◎ SOL', callback_data: 'limit_from_SOL' }, { text: '◈ XRP', callback_data: 'limit_from_XRP' }],
        [{ text: '« Back', callback_data: 'limit_list' }]
      ];
      bot.editMessageText(
        `📋 *Create Limit Order*\n\n` +
        `Swap automatically when a target rate is reached.\n\n` +
        `Select the coin you want to swap FROM:`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      userConversations[chatId] = { state: 'limit_selecting_from', details: {} };
      return;
    }

    if (data && data.startsWith('limit_from_')) {
      const fromCoin = data.replace('limit_from_', '');
      const keyboard = [
        [{ text: '💵 USDT', callback_data: 'limit_to_USDT' }, { text: '💵 USDC', callback_data: 'limit_to_USDC' }],
        [{ text: '₿ BTC', callback_data: 'limit_to_BTC' }, { text: 'Ξ ETH', callback_data: 'limit_to_ETH' }],
        [{ text: '« Back', callback_data: 'new_limit_order' }]
      ];
      userConversations[chatId] = { state: 'limit_selecting_to', details: { fromCoin } };
      bot.editMessageText(
        `📋 *Create Limit Order*\n\n` +
        `From: ${fromCoin}\n\n` +
        `Select the coin you want to swap TO:`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        }
      );
      return;
    }

    if (data && data.startsWith('limit_to_')) {
      const toCoin = data.replace('limit_to_', '');
      const fromCoin = userState?.details?.fromCoin || 'BTC';
      userConversations[chatId] = { 
        state: 'limit_entering_rate', 
        details: { fromCoin, toCoin } 
      };
      
      // Try to get current rate for context
      try {
        const quote = await getQuote({
          depositCoin: fromCoin.toLowerCase(),
          settleCoin: toCoin.toLowerCase(),
          depositAmount: '1'
        });
        const currentRate = parseFloat(quote.settleAmount).toFixed(6);
        bot.editMessageText(
          `📋 *Create Limit Order*\n\n` +
          `From: ${fromCoin}\n` +
          `To: ${toCoin}\n` +
          `Current rate: 1 ${fromCoin} = ${currentRate} ${toCoin}\n\n` +
          `Enter the target rate (${toCoin} per ${fromCoin}):`,
          {
            chat_id: chatId,
            message_id: originalMessageId,
            parse_mode: 'Markdown'
          }
        );
      } catch {
        bot.editMessageText(
          `📋 *Create Limit Order*\n\n` +
          `From: ${fromCoin}\n` +
          `To: ${toCoin}\n\n` +
          `Enter the target rate (${toCoin} per ${fromCoin}):`,
          {
            chat_id: chatId,
            message_id: originalMessageId,
            parse_mode: 'Markdown'
          }
        );
      }
      return;
    }

    // === DCA CALLBACKS ===
    if (data === 'dca_pause') {
      const schedules = getUserDCAOrders(chatId);
      if (schedules.length === 0) {
        bot.sendMessage(chatId, '📋 No active DCA schedules to pause.');
        return;
      }
      const keyboard = schedules.filter(s => s.isActive).map(s => [{
        text: `⏸ ${s.fromCoin}→${s.toCoin} ${s.amount}`,
        callback_data: `dca_dopause_${s.id}`
      }]);
      bot.editMessageText('Select a DCA schedule to pause:', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    if (data && data.startsWith('dca_dopause_')) {
      const scheduleId = parseInt(data.replace('dca_dopause_', ''));
      pauseDCAOrder(chatId, scheduleId);
      bot.editMessageText('⏸ DCA schedule paused.', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: {
          inline_keyboard: [[{ text: '📋 View Schedules', callback_data: 'dca_list' }]]
        }
      });
      return;
    }

    if (data === 'dca_resume') {
      const schedules = getUserDCAOrders(chatId);
      const pausedSchedules = schedules.filter(s => !s.isActive);
      if (pausedSchedules.length === 0) {
        bot.sendMessage(chatId, '📋 No paused DCA schedules.');
        return;
      }
      const keyboard = pausedSchedules.map(s => [{
        text: `▶️ ${s.fromCoin}→${s.toCoin} ${s.amount}`,
        callback_data: `dca_doresume_${s.id}`
      }]);
      bot.editMessageText('Select a DCA schedule to resume:', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    if (data && data.startsWith('dca_doresume_')) {
      const scheduleId = parseInt(data.replace('dca_doresume_', ''));
      resumeDCAOrder(chatId, scheduleId);
      bot.editMessageText('▶️ DCA schedule resumed.', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: {
          inline_keyboard: [[{ text: '📋 View Schedules', callback_data: 'dca_list' }]]
        }
      });
      return;
    }

    if (data === 'dca_cancel') {
      const schedules = getUserDCAOrders(chatId);
      if (schedules.length === 0) {
        bot.sendMessage(chatId, '📋 No DCA schedules to cancel.');
        return;
      }
      const keyboard = schedules.map(s => [{
        text: `❌ ${s.fromCoin}→${s.toCoin} ${s.amount}`,
        callback_data: `dca_docancel_${s.id}`
      }]);
      bot.editMessageText('Select a DCA schedule to cancel:', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    if (data && data.startsWith('dca_docancel_')) {
      const scheduleId = parseInt(data.replace('dca_docancel_', ''));
      deleteDCAOrder(chatId, scheduleId);
      bot.editMessageText('❌ DCA schedule cancelled.', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: {
          inline_keyboard: [[{ text: '📋 View Schedules', callback_data: 'dca_list' }]]
        }
      });
      return;
    }

    if (data === 'dca_list') {
      const schedules = getUserDCAOrders(chatId);
      if (schedules.length === 0) {
        bot.sendMessage(chatId, '📋 No DCA schedules set up yet. Use /dca to create one!');
        return;
      }
      let message = '📋 *Your DCA Schedules*\n\n';
      for (const schedule of schedules) {
        const status = schedule.isActive ? '✅ Active' : '⏸ Paused';
        message += `${status}: ${schedule.amount} ${schedule.fromCoin} → ${schedule.toCoin}\n`;
        message += `  Frequency: ${schedule.frequency}\n`;
        message += `  Next: ${schedule.nextExecutionAt.toLocaleDateString()}\n\n`;
      }
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // === LIMIT ORDER CALLBACKS ===
    if (data === 'limit_cancel') {
      const orders = await getUserLimitOrders(chatId);
      if (orders.length === 0) {
        bot.sendMessage(chatId, '📋 No limit orders to cancel.');
        return;
      }
      const keyboard = orders.map(o => [{
        text: `❌ ${o.fromCoin}→${o.toCoin} @ ${o.targetRate}`,
        callback_data: `limit_docancel_${o.id}`
      }]);
      bot.editMessageText('Select a limit order to cancel:', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    if (data && data.startsWith('limit_docancel_')) {
      const orderId = parseInt(data.replace('limit_docancel_', ''));
      await cancelLimitOrder(chatId, orderId);
      bot.editMessageText('❌ Limit order cancelled.', {
        chat_id: chatId,
        message_id: originalMessageId,
        reply_markup: {
          inline_keyboard: [[{ text: '📋 View Orders', callback_data: 'limit_list' }]]
        }
      });
      return;
    }

    if (data === 'limit_list') {
      const orders = await getUserLimitOrders(chatId);
      if (orders.length === 0) {
        bot.sendMessage(chatId, '📋 No active limit orders. Use /limitorder to create one!');
        return;
      }
      let message = '📋 *Your Limit Orders*\n\n';
      for (const order of orders) {
        message += `📊 ${order.amount} ${order.fromCoin} → ${order.toCoin}\n`;
        message += `  Target Rate: ${order.targetRate}\n`;
        message += `  Created: ${order.createdAt.toLocaleDateString()}\n\n`;
      }
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

    // === LANGUAGE CALLBACKS ===
    if (data && data.startsWith('set_lang_')) {
      const lang = data.replace('set_lang_', '') as Language;
      
      // Update in memory cache
      await setUserLanguage(chatId, lang);
      
      // Persist to database
      try {
        await updateUserLanguage(chatId, lang);
      } catch (err) {
        console.error('Failed to save language to DB:', err);
      }
      
      const languages: Record<string, string> = {
        'en': 'English 🇺🇸',
        'es': 'Español 🇪🇸',
        'fr': 'Français 🇫🇷',
        'ru': 'Русский 🇷🇺',
        'zh': '中文 🇨🇳'
      };
      
      // Use the new language for the confirmation
      const confirmations: Record<string, string> = {
        'en': `✅ Language set to ${languages[lang]}!`,
        'es': `✅ Idioma cambiado a ${languages[lang]}!`,
        'fr': `✅ Langue changée en ${languages[lang]}!`,
        'ru': `✅ Язык изменён на ${languages[lang]}!`,
        'zh': `✅ 语言已更改为 ${languages[lang]}!`
      };
      
      bot.editMessageText(confirmations[lang] || confirmations['en'], {
        chat_id: chatId,
        message_id: originalMessageId
      });
      return;
    }

    // === REFERRAL CALLBACKS ===
    if (data === 'ref_stats') {
      const stats = await getReferralStats(chatId);
      if (!stats) {
        bot.sendMessage(chatId, '📊 No referral statistics yet.');
        return;
      }
      const message = `📊 *Your Referral Stats*

🔗 Your Code: \`${stats.referralCode}\`
👥 Referrals: ${stats.totalReferrals}
💰 Total Earnings: ${stats.totalEarnings.toFixed(8)}

Share your code with friends!`;
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      return;
    }

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
      if (!userState || !userState.details.fromCoin) {
        bot.sendMessage(chatId, '⚠️ Please start a new alert with /alert.');
        return;
      }
      userConversations[chatId].details.direction = direction;
      userConversations[chatId].state = 'setting_alert_rate';
      
      const fromCoin = userState.details.fromCoin;
      const toCoin = userState.details.toCoin || 'USDT';
      const isUsdAlert = toCoin === 'USDT' || toCoin === 'USDC';
      
      // For USD alerts, show price in $ format
      const priceLabel = isUsdAlert 
        ? `Enter target price in USD (e.g., 45000 for $45,000):`
        : `Enter the target rate for ${fromCoin}/${toCoin}:`;
      
      bot.editMessageText(
        `🎯 *Alert: ${fromCoin}${isUsdAlert ? '/USD' : '/' + toCoin}*\n\n` +
        `Direction: ${direction === 'above' ? '⬆️ Above' : '⬇️ Below'}\n\n` +
        `${priceLabel}`,
        {
          chat_id: chatId,
          message_id: originalMessageId,
          parse_mode: 'Markdown'
        }
      );
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
        // Check if quote has expired
        if (userState.details.quoteExpiresAt) {
          const { expired, formatted } = getQuoteCountdown(userState.details.quoteExpiresAt);
          if (expired) {
            bot.editMessageText(`⏰ *Quote Expired*\n\nThis quote has expired. Please get a new quote.`, { 
              chat_id: chatId, 
              message_id: originalMessageId,
              parse_mode: 'Markdown'
            });
            bot.sendMessage(chatId, '🔄 Would you like to get a new quote?', {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔁 Get New Quote', callback_data: 'back_amount' },
                    { text: '❌ Cancel', callback_data: 'cancel_swap' }
                  ]
                ]
              }
            });
            return;
          }
        }
        
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
      const isUsdAlert = toCoin === 'USDT' || toCoin === 'USDC';

      addAlert({
        chatId,
        from: fromCoin.toLowerCase(),
        to: toCoin.toLowerCase(),
        targetRate: rate,
        direction: direction
      });

      // Format message nicely for USD alerts
      const rateDisplay = isUsdAlert 
        ? `$${rate.toLocaleString()}` 
        : `${rate} ${toCoin}`;
      const pairDisplay = isUsdAlert 
        ? `${fromCoin}/USD` 
        : `${fromCoin}/${toCoin}`;

      bot.sendMessage(chatId, 
        `✅ *Alert Created!*\n\n` +
        `📊 Pair: ${pairDisplay}\n` +
        `🎯 Trigger: ${direction === 'above' ? '⬆️ Above' : '⬇️ Below'} ${rateDisplay}\n\n` +
        `I'll notify you when the price reaches your target!`, 
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '📋 View Alerts', callback_data: 'view_alerts' },
              { text: '➕ New Alert', callback_data: 'new_alert' }
            ]]
          }
        }
      );
      delete userConversations[chatId];
      return;
    }

    // State: DCA entering amount
    if (userState && userState.state === 'dca_entering_amount') {
      const amount = msg.text.trim();
      
      if (!/^\d*\.?\d+$/.test(amount) || parseFloat(amount) <= 0) {
        bot.sendMessage(chatId, '⚠️ Please enter a valid positive number (e.g., 0.1).');
        return;
      }

      const { fromCoin, toCoin, frequency } = userState.details;
      
      bot.sendMessage(chatId,
        `🔄 *DCA Order Setup*\n\n` +
        `From: ${fromCoin}\n` +
        `To: ${toCoin}\n` +
        `Amount: ${amount} ${fromCoin}\n` +
        `Frequency: ${frequency}\n\n` +
        `Enter your ${toCoin} receiving address:`,
        { parse_mode: 'Markdown' }
      );
      
      userConversations[chatId] = {
        state: 'dca_entering_address',
        details: { ...userState.details, amount }
      };
      return;
    }

    // State: DCA entering address
    if (userState && userState.state === 'dca_entering_address') {
      const settleAddress = msg.text.trim();
      const { fromCoin, toCoin, frequency, amount } = userState.details;
      
      try {
        const order = await createDCAOrder(
          chatId,
          fromCoin,
          toCoin,
          amount,
          frequency,
          settleAddress
        );
        
        bot.sendMessage(chatId,
          `✅ *DCA Order Created!*\n\n` +
          `📊 ${amount} ${fromCoin} → ${toCoin}\n` +
          `⏰ Frequency: ${frequency}\n` +
          `📍 Address: \`${settleAddress.substring(0, 20)}...\`\n\n` +
          `Your first swap will execute according to the schedule.\n` +
          `Use /dca to manage your orders.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '📋 View DCA Orders', callback_data: 'dca_list' }]]
            }
          }
        );
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Error creating DCA order. Please try again.');
      }
      
      delete userConversations[chatId];
      return;
    }

    // State: Limit order entering rate
    if (userState && userState.state === 'limit_entering_rate') {
      const targetRate = parseFloat(msg.text.trim());
      
      if (isNaN(targetRate) || targetRate <= 0) {
        bot.sendMessage(chatId, '⚠️ Please enter a valid positive number for the rate.');
        return;
      }

      const { fromCoin, toCoin } = userState.details;
      
      bot.sendMessage(chatId,
        `📋 *Limit Order Setup*\n\n` +
        `From: ${fromCoin}\n` +
        `To: ${toCoin}\n` +
        `Target rate: ${targetRate} ${toCoin}/${fromCoin}\n\n` +
        `Enter the amount of ${fromCoin} to swap:`,
        { parse_mode: 'Markdown' }
      );
      
      userConversations[chatId] = {
        state: 'limit_entering_amount',
        details: { ...userState.details, targetRate }
      };
      return;
    }

    // State: Limit order entering amount
    if (userState && userState.state === 'limit_entering_amount') {
      const amount = msg.text.trim();
      
      if (!/^\d*\.?\d+$/.test(amount) || parseFloat(amount) <= 0) {
        bot.sendMessage(chatId, '⚠️ Please enter a valid positive number (e.g., 0.1).');
        return;
      }

      const { fromCoin, toCoin, targetRate } = userState.details;
      
      bot.sendMessage(chatId,
        `📋 *Limit Order Setup*\n\n` +
        `From: ${amount} ${fromCoin}\n` +
        `To: ${toCoin}\n` +
        `Target rate: ${targetRate}\n\n` +
        `Enter your ${toCoin} receiving address:`,
        { parse_mode: 'Markdown' }
      );
      
      userConversations[chatId] = {
        state: 'limit_entering_address',
        details: { ...userState.details, amount }
      };
      return;
    }

    // State: Limit order entering address
    if (userState && userState.state === 'limit_entering_address') {
      const settleAddress = msg.text.trim();
      const { fromCoin, toCoin, targetRate, amount } = userState.details;
      
      try {
        const order = await createLimitOrder(
          chatId,
          fromCoin,
          toCoin,
          amount,
          targetRate,
          'below', // Default to below for now
          settleAddress
        );
        
        bot.sendMessage(chatId,
          `✅ *Limit Order Created!*\n\n` +
          `📊 ${amount} ${fromCoin} → ${toCoin}\n` +
          `🎯 Target rate: ${targetRate}\n` +
          `📍 Address: \`${settleAddress.substring(0, 20)}...\`\n\n` +
          `I'll execute this swap when the rate reaches your target.\n` +
          `Use /limitorder to manage your orders.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '📋 View Limit Orders', callback_data: 'limit_list' }]]
            }
          }
        );
      } catch (error) {
        bot.sendMessage(chatId, '⚠️ Error creating limit order. Please try again.');
      }
      
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
      const lang = getUserLanguage(chatId);

      // --- Min/Max Validation with slippage protection ---
      try {
        const validationResult = await validateSwapAmount(
          fromCoin, 
          toCoin, 
          amount, 
          fromNetwork, 
          toNetwork
        );

        if (!validationResult.valid) {
          const errorMessage = formatValidationError(validationResult);
          bot.sendMessage(chatId, errorMessage, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '📊 View Limits', callback_data: `view_limits_${fromCoin}_${toCoin}` },
                  { text: '🔁 Try Different Amount', callback_data: 'back_amount' }
                ]
              ]
            }
          });
          return;
        }

        // Show warning if close to limits
        if (validationResult.warning) {
          bot.sendMessage(chatId, `⚠️ ${validationResult.warning}`);
        }
      } catch (validationError) {
        // Continue without validation if it fails (fallback to API validation)
        console.warn('Validation check failed, proceeding:', validationError);
      }

      // --- Advanced: Show market trend and fee breakdown ---
      let trendMsg = '';
      let feeMsg = '';
      try {
        const trend = await getMarketTrend(fromCoin, toCoin);
        if (trend) {
          trendMsg = `\n📊 24h trend: ${trend.direction === 'up' ? '⬆️' : trend.direction === 'down' ? '⬇️' : '⏸'} ${trend.trendPct > 0 ? '+' : ''}${trend.trendPct}%`;
        }
        const fees = await getFeeBreakdown(fromCoin, toCoin, amount, fromNetwork, toNetwork);
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
        
        // Format countdown timer
        const countdownText = formatCountdown(quote.expiresAt);

        const confirmationText =
          `🤔 *Please confirm your swap:*\n\n` +
          `📤 From: \`${quote.depositAmount}\` ${quote.depositCoin.toUpperCase()}` +
          `${fromNetwork ? ` on ${fromNetwork}` : ''}\n` +
          `📥 To: \`${quote.settleAmount}\` ${quote.settleCoin.toUpperCase()}` +
          `${toNetwork ? ` on ${toNetwork}` : ''}\n` +
          `💱 Rate: 1 ${quote.depositCoin.toUpperCase()} = ${rate} ${quote.settleCoin.toUpperCase()}\n\n` +
          `${countdownText}` +
          trendMsg + feeMsg;

        userConversations[chatId] = {
          state: 'awaiting_confirmation',
          details: {
            quoteId: quote.id,
            quoteExpiresAt: quote.expiresAt,
            toCurrency: quote.settleCoin.toUpperCase(),
            fromCurrency: quote.depositCoin.toUpperCase(),
            fromCoin,
            toCoin,
            fromNetwork,
            toNetwork
          }
        };

        bot.sendMessage(chatId, confirmationText, {
          parse_mode: 'Markdown',
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
      const { quoteId, settleAddress, fromCurrency, toCurrency, fromCoin, toCoin, fromNetwork, toNetwork } = userState.details;

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

        // Record swap to database
        try {
          await recordShift(
            chatId,
            shift.id,
            shift.depositCoin,
            shift.settleCoin,
            shift.depositAmount,
            settleAddress,
            {
              fromNetwork: shift.depositNetwork,
              toNetwork: shift.settleNetwork,
              settleAmount: shift.settleAmount,
              depositAddress: shift.depositAddress,
              refundAddress: shiftParams.refundAddress,
              rate: shift.rate
            }
          );
          console.log(`✅ Swap recorded to database: ${shift.id}`);
        } catch (dbError) {
          console.error('Failed to record swap to database:', dbError);
        }

        // Generate QR code for deposit address
        try {
          const qrUri = formatCryptoURI(shift.depositCoin, shift.depositAddress, shift.depositAmount);
          const qrBuffer = await generateQRCodeBuffer(qrUri);
          
          // Send QR code image
          await bot.sendPhoto(chatId, qrBuffer, {
            caption: `📱 *Scan to pay*\n\nSend exactly *${shift.depositAmount} ${shift.depositCoin.toUpperCase()}* to:\n\`${shift.depositAddress}\``,
            parse_mode: 'Markdown'
          });
        } catch (qrError) {
          console.error('Failed to generate QR code:', qrError);
          // Fall back to text-only message
          bot.sendMessage(chatId, `✨ Shift created! Please send exactly ${shift.depositAmount} ${shift.depositCoin.toUpperCase()} to:\n\`${shift.depositAddress}\``, { parse_mode: 'Markdown' });
        }

        bot.sendMessage(chatId, `🆔 Shift ID: \`${shift.id}\`\n\nI will notify you of any updates. Use /status to check anytime.\nType /cancel before sending funds to cancel.`, { parse_mode: 'Markdown' });
        
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
            
            // Update database with status
            try {
              await updateShiftStatus(shift.id, statusResponse.status, statusResponse.settleAmount);
            } catch (dbError) {
              console.error('Failed to update swap status in database:', dbError);
            }

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

    // Disconnect from database
    try {
      await disconnectDatabase();
      console.log('✅ Database disconnected');
    } catch (dbErr) {
      console.error('Error disconnecting database:', dbErr);
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