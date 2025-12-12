import {
  createSwapRecord,
  getUserSwaps,
  getUserSwapStats,
  updateSwapStatus,
  getSwapByShiftId
} from './database';

// Re-export types for compatibility
export type SwapRecord = {
  chatId: number;
  from: string;
  to: string;
  amount: string;
  date: string;
  txId?: string;
};

/**
 * Add a swap record (for tracking swap intents before shift creation)
 * Note: Full swap records are created via createSwapRecord with shiftId
 */
export async function addSwap(record: SwapRecord) {
  // This is called during quote phase - we'll create a proper record when shift is created
  // For now, just log it
  console.log(`Swap intent logged: ${record.amount} ${record.from} -> ${record.to}`);
}

/**
 * Get user's swap history
 */
export async function getUserHistory(chatId: number, limit: number = 10) {
  return getUserSwaps(chatId, limit);
}

/**
 * Get swap statistics for a user
 */
export async function getSwapStats(chatId: number) {
  return getUserSwapStats(chatId);
}

/**
 * Create a full swap record when shift is created
 */
export async function recordShift(
  chatId: number,
  shiftId: string,
  fromCoin: string,
  toCoin: string,
  depositAmount: string,
  settleAddress: string,
  options?: {
    fromNetwork?: string;
    toNetwork?: string;
    settleAmount?: string;
    depositAddress?: string;
    refundAddress?: string;
    rate?: string;
  }
) {
  return createSwapRecord(chatId, shiftId, fromCoin, toCoin, depositAmount, settleAddress, options);
}

/**
 * Update swap status (called during polling)
 */
export async function updateShiftStatus(shiftId: string, status: string, settleAmount?: string) {
  const completedStatuses = ['complete', 'refunded', 'rejected', 'expired'];
  const completedAt = completedStatuses.includes(status) ? new Date() : undefined;
  return updateSwapStatus(shiftId, status, settleAmount, completedAt);
}

/**
 * Get swap by shift ID
 */
export async function getShiftRecord(shiftId: string) {
  return getSwapByShiftId(shiftId);
}

/**
 * Format swap history for display
 */
export function formatSwapHistory(swaps: any[]): string {
  if (swaps.length === 0) {
    return "📭 You haven't made any swaps yet. Use /swap to start!";
  }

  let message = "📜 *Your Swap History*\n\n";

  swaps.forEach((swap, index) => {
    const date = new Date(swap.createdAt).toLocaleDateString();
    const statusEmoji = getStatusEmoji(swap.status);
    
    message += `${index + 1}. ${statusEmoji} *${swap.fromCoin.toUpperCase()} → ${swap.toCoin.toUpperCase()}*\n`;
    message += `   Amount: ${swap.depositAmount} ${swap.fromCoin.toUpperCase()}\n`;
    if (swap.settleAmount) {
      message += `   Received: ${swap.settleAmount} ${swap.toCoin.toUpperCase()}\n`;
    }
    message += `   Status: ${swap.status}\n`;
    message += `   Date: ${date}\n`;
    message += `   ID: \`${swap.shiftId}\`\n\n`;
  });

  return message;
}

/**
 * Format swap stats for display
 */
export function formatSwapStats(stats: any): string {
  if (!stats) {
    return "📊 No statistics available yet.";
  }

  return `📊 *Your Swap Statistics*

🔄 Total Swaps: ${stats.totalSwaps}
✅ Completed: ${stats.completedSwaps}
⏳ Pending: ${stats.pendingSwaps}
⭐ Favorite Pair: ${stats.favoritePair || 'N/A'}`;
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'complete': return '✅';
    case 'pending': return '⏳';
    case 'waiting': return '⏳';
    case 'processing': return '🔄';
    case 'settling': return '📤';
    case 'refunded': return '↩️';
    case 'expired': return '⏰';
    case 'rejected': return '❌';
    default: return '❓';
  }
}
