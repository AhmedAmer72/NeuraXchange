import * as dotenv from 'dotenv';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { NlpManager } from 'node-nlp';
import * as fs from 'fs';
import { getQuote, createShift, pollShiftStatus, cancelShift } from './sideshift';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN not found in environment variables');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// State management for conversations
const userConversations: { [key: number]: any } = {};

const nlpManager = new NlpManager({ languages: ['en'], forceNER: true });

if (fs.existsSync('model.nlp')) {
    const modelData = fs.readFileSync('model.nlp', 'utf8');
    nlpManager.import(modelData);
    console.log('NLP model loaded successfully.');
} else {
    console.error('FATAL ERROR: model.nlp not found. Please run `npx ts-node src/nlp.ts` first.');
    process.exit(1);
};

console.log('Bot is running...');

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
  const welcomeMessage = `👋 Welcome! Tell me what you want to swap.\n\n*Examples:*\n\`swap 0.1 ETH on arbitrum for SOL\`\n\`/price btc to eth\``;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});


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
                    // We need to check if the user state still exists before running the scheduled cancel
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
    const exampleMessage = `Please provide the currencies you want to check.\n\n*Examples:*\n\`/price eth to btc\`\n\`/price eth (arbitrum) to sol\``;
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
        const settleAddress = msg.text;
        const { amount, fromCurrency, toCurrency, network } = userState.details;
        
        try {
            bot.sendMessage(chatId, '⏳ Fetching a quote from SideShift...');
            const quote = await getQuote({
                depositCoin: fromCurrency.toLowerCase(),
                settleCoin: toCurrency.toLowerCase(),
                depositAmount: amount.toString(),
                depositNetwork: network? network.toLowerCase() : undefined
            });

            bot.sendMessage(chatId, '✅ Quote received. Creating your shift...');
            const shift = await createShift({ quoteId: quote.id, settleAddress });

            bot.sendMessage(chatId, `✨ Shift created! Please send exactly ${shift.depositAmount} ${shift.depositCoin.toUpperCase()} to the following address:\n\n\`${shift.depositAddress}\`\n\nI will notify you of any updates. You can type /cancel at any time before sending funds.`, { parse_mode: 'Markdown' });
            
            userConversations[chatId].state = 'polling_status';
            userConversations[chatId].shiftId = shift.id;
            // CORRECTED: Ensure the creation timestamp is stored
            userConversations[chatId].createdAt = Date.now(); 
            
            const intervalId = setInterval(async () => {
                if (!userConversations[chatId]) {
                    clearInterval(intervalId);
                    return;
                }
                const statusResponse = await pollShiftStatus(shift.id);
                if (statusResponse.status!== userConversations[chatId].lastStatus) {
                    bot.sendMessage(chatId, `🔄 Swap Status Update: *${statusResponse.status}*`, { parse_mode: 'Markdown' });
                    userConversations[chatId].lastStatus = statusResponse.status;
                }
                if (['complete', 'refunded', 'rejected', 'expired'].includes(statusResponse.status)) {
                    clearInterval(intervalId);
                    delete userConversations[chatId];
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
            const network = networkEntity? networkEntity.option : undefined;
            const networkText = network? ` on ${network}` : '';

            userConversations[chatId] = {
                state: 'awaiting_confirmation',
                details: { amount, fromCurrency, toCurrency, network }
            };

            const confirmationText = `🤔 Got it. You want to swap ${amount} ${fromCurrency}${networkText} for ${toCurrency}. Is this correct?`;
            
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

        } else {
            bot.sendMessage(chatId, "I couldn't understand all the swap details. Please specify the amount, the currency to send, and the currency to receive.");
        }
    } else {
        if (!userState) {
            bot.sendMessage(chatId, "I'm not sure how to help with that. I can only process swap requests. Try /start to see an example.");
        }
    }
});
