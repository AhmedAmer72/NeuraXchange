// DCA (Dollar Cost Averaging) Mode
// Automated recurring swaps at specified intervals
import { prisma, getOrCreateUser } from './database';
import TelegramBot from 'node-telegram-bot-api';

export interface DCAOrder {
  id: number;
  chatId: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork?: string;
  toNetwork?: string;
  amount: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  settleAddress: string;
  refundAddress?: string;
  isActive: boolean;
  totalExecutions: number;
  maxExecutions?: number; // Optional limit
  lastExecutedAt?: Date;
  nextExecutionAt: Date;
  createdAt: Date;
  executionHistory: { date: Date; shiftId?: string; error?: string }[];
}

// In-memory store for DCA orders
const dcaOrders: Map<number, DCAOrder> = new Map();
let dcaIdCounter = 1;

/**
 * Get next execution time based on frequency
 */
function getNextExecution(frequency: DCAOrder['frequency'], fromDate: Date = new Date()): Date {
  const next = new Date(fromDate);
  switch (frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

/**
 * Create a new DCA order
 */
export async function createDCAOrder(
  chatId: number,
  fromCoin: string,
  toCoin: string,
  amount: string,
  frequency: DCAOrder['frequency'],
  settleAddress: string,
  options?: {
    fromNetwork?: string;
    toNetwork?: string;
    refundAddress?: string;
    maxExecutions?: number;
  }
): Promise<DCAOrder> {
  await getOrCreateUser(chatId);
  
  const order: DCAOrder = {
    id: dcaIdCounter++,
    chatId,
    fromCoin: fromCoin.toLowerCase(),
    toCoin: toCoin.toLowerCase(),
    fromNetwork: options?.fromNetwork,
    toNetwork: options?.toNetwork,
    amount,
    frequency,
    settleAddress,
    refundAddress: options?.refundAddress,
    isActive: true,
    totalExecutions: 0,
    maxExecutions: options?.maxExecutions,
    nextExecutionAt: getNextExecution(frequency),
    createdAt: new Date(),
    executionHistory: [],
  };

  dcaOrders.set(order.id, order);
  return order;
}

/**
 * Get user's DCA orders
 */
export function getUserDCAOrders(chatId: number): DCAOrder[] {
  return Array.from(dcaOrders.values())
    .filter(order => order.chatId === chatId);
}

/**
 * Get user's active DCA orders
 */
export function getActiveDCAOrders(chatId: number): DCAOrder[] {
  return Array.from(dcaOrders.values())
    .filter(order => order.chatId === chatId && order.isActive);
}

/**
 * Pause/Resume a DCA order
 */
export function toggleDCAOrder(chatId: number, orderId: number): { success: boolean; isActive: boolean } {
  const order = dcaOrders.get(orderId);
  if (order && order.chatId === chatId) {
    order.isActive = !order.isActive;
    if (order.isActive) {
      // Reset next execution when resuming
      order.nextExecutionAt = getNextExecution(order.frequency);
    }
    return { success: true, isActive: order.isActive };
  }
  return { success: false, isActive: false };
}

/**
 * Pause a DCA order
 */
export function pauseDCAOrder(chatId: number, orderId: number): boolean {
  const order = dcaOrders.get(orderId);
  if (order && order.chatId === chatId) {
    order.isActive = false;
    return true;
  }
  return false;
}

/**
 * Resume a DCA order
 */
export function resumeDCAOrder(chatId: number, orderId: number): boolean {
  const order = dcaOrders.get(orderId);
  if (order && order.chatId === chatId) {
    order.isActive = true;
    order.nextExecutionAt = getNextExecution(order.frequency);
    return true;
  }
  return false;
}

/**
 * Delete a DCA order
 */
export function deleteDCAOrder(chatId: number, orderId: number): boolean {
  const order = dcaOrders.get(orderId);
  if (order && order.chatId === chatId) {
    dcaOrders.delete(orderId);
    return true;
  }
  return false;
}

/**
 * Check and execute DCA orders
 */
export async function executeDCAOrders(
  bot: TelegramBot,
  createShiftFn: (params: any) => Promise<any>,
  getQuoteFn: (params: any) => Promise<any>
): Promise<void> {
  const now = new Date();
  const activeOrders = Array.from(dcaOrders.values())
    .filter(o => o.isActive && o.nextExecutionAt <= now);
  
  if (activeOrders.length === 0) return;
  
  console.log(`Executing ${activeOrders.length} DCA orders...`);

  for (const order of activeOrders) {
    try {
      // Check if max executions reached
      if (order.maxExecutions && order.totalExecutions >= order.maxExecutions) {
        order.isActive = false;
        await bot.sendMessage(order.chatId,
          `🏁 *DCA Order Completed*\n\n` +
          `Your DCA order for ${order.fromCoin.toUpperCase()} → ${order.toCoin.toUpperCase()} ` +
          `has reached ${order.maxExecutions} executions and is now complete.`,
          { parse_mode: 'Markdown' }
        );
        continue;
      }

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

      // Update order
      order.totalExecutions++;
      order.lastExecutedAt = now;
      order.nextExecutionAt = getNextExecution(order.frequency, now);
      order.executionHistory.push({ date: now, shiftId: shift.id });

      // Notify user
      await bot.sendMessage(order.chatId,
        `🔄 *DCA Order Executed!*\n\n` +
        `#${order.totalExecutions}${order.maxExecutions ? `/${order.maxExecutions}` : ''}\n\n` +
        `Pair: ${order.fromCoin.toUpperCase()} → ${order.toCoin.toUpperCase()}\n` +
        `Amount: ${order.amount} ${order.fromCoin.toUpperCase()}\n` +
        `Shift ID: \`${shift.id}\`\n\n` +
        `📤 Send ${shift.depositAmount} ${shift.depositCoin.toUpperCase()} to:\n` +
        `\`${shift.depositAddress}\`\n\n` +
        `Next execution: ${order.nextExecutionAt.toLocaleString()}`,
        { parse_mode: 'Markdown' }
      );

    } catch (error: any) {
      console.error(`Error executing DCA order ${order.id}:`, error.message);
      
      // Record failure but don't stop the DCA
      order.executionHistory.push({ date: now, error: error.message });
      order.nextExecutionAt = getNextExecution(order.frequency, now);

      await bot.sendMessage(order.chatId,
        `⚠️ *DCA Execution Failed*\n\n` +
        `Could not execute DCA order: ${error.message}\n\n` +
        `Will retry at: ${order.nextExecutionAt.toLocaleString()}`,
        { parse_mode: 'Markdown' }
      );
    }
  }
}

/**
 * Format DCA orders for display
 */
export function formatDCAOrders(orders: DCAOrder[]): string {
  if (orders.length === 0) {
    return `🔄 *DCA Orders*\n\nYou have no DCA orders set up.\n\nUse /dca to create automated recurring swaps!`;
  }

  let message = `🔄 *Your DCA Orders*\n\n`;
  
  orders.forEach((order, index) => {
    const status = order.isActive ? '🟢 Active' : '⏸️ Paused';
    message += `${index + 1}. *${order.fromCoin.toUpperCase()} → ${order.toCoin.toUpperCase()}*\n`;
    message += `   ${status}\n`;
    message += `   Amount: ${order.amount} ${order.fromCoin.toUpperCase()}\n`;
    message += `   Frequency: ${order.frequency}\n`;
    message += `   Executions: ${order.totalExecutions}${order.maxExecutions ? `/${order.maxExecutions}` : ''}\n`;
    if (order.isActive) {
      message += `   Next: ${order.nextExecutionAt.toLocaleString()}\n`;
    }
    message += '\n';
  });

  return message;
}

/**
 * Get frequency options for display
 */
export function getFrequencyOptions(): { value: DCAOrder['frequency']; label: string }[] {
  return [
    { value: 'hourly', label: '⏰ Every Hour' },
    { value: 'daily', label: '📅 Daily' },
    { value: 'weekly', label: '📆 Weekly' },
    { value: 'monthly', label: '🗓️ Monthly' },
  ];
}
