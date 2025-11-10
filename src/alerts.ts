import { getCurrentRate } from './marketData';
import TelegramBot from 'node-telegram-bot-api';

// Price alert storage and notification (in-memory for now)
// TODO: Use persistent DB for production
export type PriceAlert = { chatId: number, from: string, to: string, targetRate: number, direction: 'above'|'below' };
export const alerts: PriceAlert[] = [];
export function addAlert(alert: PriceAlert) { alerts.push(alert); }
export function getAlertsForPair(from: string, to: string) { return alerts.filter(a => a.from === from && a.to === to); }

/**
 * Check all active alerts against current market rates
 */
export async function checkAlerts(bot: TelegramBot) {
  if (alerts.length === 0) {
    return;
  }

  console.log('Checking for triggered alerts...');
  
  for (let i = alerts.length - 1; i >= 0; i--) {
    const alert = alerts[i];
    try {
      const currentRate = await getCurrentRate(alert.from, alert.to);
      
      const triggered = (alert.direction === 'above' && currentRate > alert.targetRate) ||
                        (alert.direction === 'below' && currentRate < alert.targetRate);
      
      if (triggered) {
        const message = `
          🔔 PRICE ALERT! 🔔
          Pair: ${alert.from.toUpperCase()}/${alert.to.toUpperCase()}
          Target: ${alert.direction} ${alert.targetRate}
          Current: ${currentRate}
        `;
        
        bot.sendMessage(alert.chatId, message);
        
        // Remove triggered alert
        alerts.splice(i, 1);
      }
    } catch (error: any) {
      console.error(`Error checking alert for ${alert.from}/${alert.to}:`, error.message);
    }
  }
}
