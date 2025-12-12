import { getCurrentRate } from './marketData';
import TelegramBot from 'node-telegram-bot-api';
import { 
  createAlert as dbCreateAlert,
  getUserAlerts as dbGetUserAlerts,
  getActiveAlerts as dbGetActiveAlerts,
  triggerAlert as dbTriggerAlert,
  deleteUserAlert as dbDeleteUserAlert
} from './database';

// Re-export types for compatibility
export type PriceAlert = { 
  chatId: number;
  from: string;
  to: string;
  targetRate: number;
  direction: 'above' | 'below';
};

/**
 * Add a new price alert (persisted to database)
 */
export async function addAlert(alert: PriceAlert): Promise<void> {
  await dbCreateAlert(
    alert.chatId,
    alert.from,
    alert.to,
    alert.targetRate,
    alert.direction
  );
}

/**
 * Get all alerts for a specific user
 */
export async function getUserAlerts(chatId: number) {
  return dbGetUserAlerts(chatId);
}

/**
 * Get alerts for a specific pair (for compatibility)
 */
export async function getAlertsForPair(from: string, to: string) {
  const allAlerts = await dbGetActiveAlerts();
  return allAlerts.filter(a => a.fromCoin === from.toLowerCase() && a.toCoin === to.toLowerCase());
}

/**
 * Delete a user's alert
 */
export async function deleteAlert(chatId: number, alertId: number): Promise<boolean> {
  return dbDeleteUserAlert(chatId, alertId);
}

/**
 * Check all active alerts against current market rates
 */
export async function checkAlerts(bot: TelegramBot) {
  try {
    const alerts = await dbGetActiveAlerts();
    
    if (alerts.length === 0) {
      return;
    }

    console.log(`Checking ${alerts.length} active alerts...`);
    
    for (const alert of alerts) {
      try {
        const currentRate = await getCurrentRate(alert.fromCoin, alert.toCoin);
        
        const triggered = 
          (alert.direction === 'above' && currentRate > alert.targetRate) ||
          (alert.direction === 'below' && currentRate < alert.targetRate);
        
        if (triggered) {
          const message = `🔔 *PRICE ALERT TRIGGERED!* 🔔

📊 Pair: *${alert.fromCoin.toUpperCase()}/${alert.toCoin.toUpperCase()}*
🎯 Target: ${alert.direction} ${alert.targetRate}
💰 Current Rate: ${currentRate}

Your alert has been triggered and removed.`;
          
          await bot.sendMessage(Number(alert.user.chatId), message, { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: '🔁 Swap Now', callback_data: 'swap_again' },
                { text: '➕ New Alert', callback_data: 'new_alert' }
              ]]
            }
          });
          
          // Mark alert as triggered
          await dbTriggerAlert(alert.id);
        }
      } catch (error: any) {
        console.error(`Error checking alert ${alert.id} for ${alert.fromCoin}/${alert.toCoin}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('Error in checkAlerts:', error.message);
  }
}
