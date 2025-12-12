// Limit Orders - Swap when price reaches target
import { prisma, getOrCreateUser } from './database';
import { getCurrentRate } from './marketData';
import TelegramBot from 'node-telegram-bot-api';

export interface LimitOrder {
  id: number;
  chatId: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork?: string;
  toNetwork?: string;
  amount: string;
  targetRate: number;
  direction: 'above' | 'below';
  settleAddress: string;
  refundAddress?: string;
  isActive: boolean;
  createdAt: Date;
  executedAt?: Date;
  shiftId?: string;
}

// In-memory store for limit orders (should be persisted)
const limitOrders: Map<number, LimitOrder> = new Map();
let orderIdCounter = 1;

/**
 * Create a new limit order
 */
export async function createLimitOrder(
  chatId: number,
  fromCoin: string,
  toCoin: string,
  amount: string,
  targetRate: number,
  direction: 'above' | 'below',
  settleAddress: string,
  options?: {
    fromNetwork?: string;
    toNetwork?: string;
    refundAddress?: string;
  }
): Promise<LimitOrder> {
  const user = await getOrCreateUser(chatId);
  
  const order: LimitOrder = {
    id: orderIdCounter++,
    chatId,
    fromCoin: fromCoin.toLowerCase(),
    toCoin: toCoin.toLowerCase(),
    fromNetwork: options?.fromNetwork,
    toNetwork: options?.toNetwork,
    amount,
    targetRate,
    direction,
    settleAddress,
    refundAddress: options?.refundAddress,
    isActive: true,
    createdAt: new Date(),
  };

  limitOrders.set(order.id, order);
  return order;
}

/**
 * Get user's active limit orders
 */
export function getUserLimitOrders(chatId: number): LimitOrder[] {
  return Array.from(limitOrders.values())
    .filter(order => order.chatId === chatId && order.isActive);
}

/**
 * Cancel a limit order
 */
export function cancelLimitOrder(chatId: number, orderId: number): boolean {
  const order = limitOrders.get(orderId);
  if (order && order.chatId === chatId && order.isActive) {
    order.isActive = false;
    return true;
  }
  return false;
}

/**
 * Check and execute limit orders
 */
export async function checkLimitOrders(
  bot: TelegramBot,
  createShiftFn: (params: any) => Promise<any>,
  getQuoteFn: (params: any) => Promise<any>
): Promise<void> {
  const activeOrders = Array.from(limitOrders.values()).filter(o => o.isActive);
  
  if (activeOrders.length === 0) return;
  
  console.log(`Checking ${activeOrders.length} limit orders...`);

  for (const order of activeOrders) {
    try {
      const currentRate = await getCurrentRate(order.fromCoin, order.toCoin);
      
      const triggered = 
        (order.direction === 'above' && currentRate >= order.targetRate) ||
        (order.direction === 'below' && currentRate <= order.targetRate);

      if (triggered) {
        console.log(`Limit order ${order.id} triggered at rate ${currentRate}`);
        
        // Notify user
        await bot.sendMessage(order.chatId, 
          `🎯 *Limit Order Triggered!*\n\n` +
          `Pair: ${order.fromCoin.toUpperCase()}/${order.toCoin.toUpperCase()}\n` +
          `Target: ${order.direction} ${order.targetRate}\n` +
          `Current: ${currentRate}\n` +
          `Amount: ${order.amount} ${order.fromCoin.toUpperCase()}\n\n` +
          `Creating swap automatically...`,
          { parse_mode: 'Markdown' }
        );

        try {
          // Get quote and create shift
          const quote = await getQuoteFn({
            depositCoin: order.fromCoin,
            settleCoin: order.toCoin,
            depositAmount: order.amount,
            depositNetwork: order.fromNetwork,
            settleNetwork: order.toNetwork,
          });

          const shift = await createShiftFn({
            quoteId: quote.id,
            settleAddress: order.settleAddress,
            refundAddress: order.refundAddress,
          });

          order.isActive = false;
          order.executedAt = new Date();
          order.shiftId = shift.id;

          await bot.sendMessage(order.chatId,
            `✅ *Limit Order Executed!*\n\n` +
            `Shift ID: \`${shift.id}\`\n` +
            `Send ${shift.depositAmount} ${shift.depositCoin.toUpperCase()} to:\n` +
            `\`${shift.depositAddress}\``,
            { parse_mode: 'Markdown' }
          );

        } catch (execError: any) {
          await bot.sendMessage(order.chatId,
            `⚠️ *Limit Order Failed*\n\n` +
            `Could not create swap: ${execError.message}\n\n` +
            `Your limit order has been deactivated.`,
            { parse_mode: 'Markdown' }
          );
          order.isActive = false;
        }
      }
    } catch (error: any) {
      console.error(`Error checking limit order ${order.id}:`, error.message);
    }
  }
}

/**
 * Format limit orders for display
 */
export function formatLimitOrders(orders: LimitOrder[]): string {
  if (orders.length === 0) {
    return `📋 *Limit Orders*\n\nYou have no active limit orders.\n\nUse /limitorder to create one!`;
  }

  let message = `📋 *Your Limit Orders*\n\n`;
  
  orders.forEach((order, index) => {
    const direction = order.direction === 'above' ? '⬆️ Above' : '⬇️ Below';
    message += `${index + 1}. *${order.fromCoin.toUpperCase()} → ${order.toCoin.toUpperCase()}*\n`;
    message += `   Amount: ${order.amount} ${order.fromCoin.toUpperCase()}\n`;
    message += `   Trigger: ${direction} ${order.targetRate}\n`;
    message += `   Created: ${order.createdAt.toLocaleDateString()}\n\n`;
  });

  return message;
}
