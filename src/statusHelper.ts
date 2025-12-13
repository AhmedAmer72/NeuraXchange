// Quote and Status Utilities
// Countdown timers, ETA calculation, and enhanced status messages

import { BLOCK_EXPLORERS, getExplorerUrl, ShiftStatus } from './types/sideshift';

/**
 * Calculate remaining time until quote expires
 */
export function getQuoteCountdown(expiresAt: string): { 
  expired: boolean; 
  remainingSeconds: number;
  formatted: string;
  urgency: 'ok' | 'warning' | 'critical' | 'expired';
} {
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const remainingMs = expiryTime - now;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  
  if (remainingSeconds <= 0) {
    return { expired: true, remainingSeconds: 0, formatted: 'Expired', urgency: 'expired' };
  }
  
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formatted = minutes > 0 
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;
  
  let urgency: 'ok' | 'warning' | 'critical' | 'expired' = 'ok';
  if (remainingSeconds <= 30) urgency = 'critical';
  else if (remainingSeconds <= 60) urgency = 'warning';
  
  return { expired: false, remainingSeconds, formatted, urgency };
}

/**
 * Format countdown with emoji based on urgency
 */
export function formatCountdown(expiresAt: string): string {
  const { expired, formatted, urgency } = getQuoteCountdown(expiresAt);
  
  if (expired) return '⏰ Quote expired';
  
  const emoji = {
    ok: '⏱️',
    warning: '⚠️',
    critical: '🚨',
    expired: '⏰'
  };
  
  return `${emoji[urgency]} Expires in: ${formatted}`;
}

/**
 * Status display configuration
 */
export const STATUS_CONFIG: Record<ShiftStatus | string, {
  emoji: string;
  title: string;
  description: string;
  color: string;
  showETA: boolean;
  avgMinutes: number;
}> = {
  pending: {
    emoji: '⏳',
    title: 'Pending',
    description: 'Waiting to receive your deposit',
    color: 'yellow',
    showETA: false,
    avgMinutes: 0
  },
  waiting: {
    emoji: '📥',
    title: 'Waiting for Deposit',
    description: 'Send your funds to the deposit address',
    color: 'blue',
    showETA: false,
    avgMinutes: 0
  },
  processing: {
    emoji: '🔄',
    title: 'Processing',
    description: 'We received your deposit and are processing the swap',
    color: 'orange',
    showETA: true,
    avgMinutes: 5
  },
  settling: {
    emoji: '📤',
    title: 'Settling',
    description: 'Sending funds to your wallet',
    color: 'blue',
    showETA: true,
    avgMinutes: 10
  },
  complete: {
    emoji: '✅',
    title: 'Complete',
    description: 'Swap completed successfully!',
    color: 'green',
    showETA: false,
    avgMinutes: 0
  },
  refunded: {
    emoji: '↩️',
    title: 'Refunded',
    description: 'Funds have been returned to your refund address',
    color: 'purple',
    showETA: false,
    avgMinutes: 0
  },
  expired: {
    emoji: '⏰',
    title: 'Expired',
    description: 'This swap has expired',
    color: 'gray',
    showETA: false,
    avgMinutes: 0
  },
  rejected: {
    emoji: '❌',
    title: 'Rejected',
    description: 'This swap was rejected',
    color: 'red',
    showETA: false,
    avgMinutes: 0
  }
};

/**
 * Get estimated time for a network
 */
export function getNetworkETA(network: string): { minMinutes: number; maxMinutes: number } {
  const networkTimes: Record<string, { minMinutes: number; maxMinutes: number }> = {
    bitcoin: { minMinutes: 10, maxMinutes: 60 },
    ethereum: { minMinutes: 1, maxMinutes: 5 },
    solana: { minMinutes: 0.5, maxMinutes: 2 },
    polygon: { minMinutes: 0.5, maxMinutes: 2 },
    bsc: { minMinutes: 0.5, maxMinutes: 3 },
    arbitrum: { minMinutes: 0.5, maxMinutes: 2 },
    optimism: { minMinutes: 0.5, maxMinutes: 2 },
    avalanche: { minMinutes: 0.5, maxMinutes: 3 },
    litecoin: { minMinutes: 2, maxMinutes: 30 },
    dogecoin: { minMinutes: 1, maxMinutes: 10 },
    tron: { minMinutes: 0.5, maxMinutes: 3 },
    xrp: { minMinutes: 0.1, maxMinutes: 1 },
    monero: { minMinutes: 20, maxMinutes: 60 },
    base: { minMinutes: 0.5, maxMinutes: 2 }
  };
  
  return networkTimes[network.toLowerCase()] || { minMinutes: 2, maxMinutes: 15 };
}

/**
 * Format enhanced status message
 */
export function formatEnhancedStatus(shift: {
  status: string;
  depositCoin: string;
  settleCoin: string;
  depositNetwork?: string;
  settleNetwork?: string;
  depositAmount: string;
  settleAmount: string;
  depositHash?: string;
  settleHash?: string;
  depositAddress?: string;
  settleAddress?: string;
  createdAt?: string;
  expiresAt?: string;
}): string {
  const config = STATUS_CONFIG[shift.status] || STATUS_CONFIG.pending;
  
  let message = `${config.emoji} *Status: ${config.title}*\n\n`;
  message += `📝 ${config.description}\n\n`;
  
  // Swap details
  message += `*Swap Details:*\n`;
  message += `📤 Sending: ${shift.depositAmount} ${shift.depositCoin.toUpperCase()}\n`;
  message += `📥 Receiving: ${shift.settleAmount} ${shift.settleCoin.toUpperCase()}\n\n`;
  
  // ETA if applicable
  if (config.showETA && shift.settleNetwork) {
    const eta = getNetworkETA(shift.settleNetwork);
    message += `⏱️ *Estimated Time:* ${eta.minMinutes}-${eta.maxMinutes} minutes\n\n`;
  }
  
  // Transaction links
  if (shift.depositHash && shift.depositNetwork) {
    const txUrl = getExplorerUrl(shift.depositNetwork, 'tx', shift.depositHash);
    if (txUrl) {
      message += `🔗 [View Deposit TX](${txUrl})\n`;
    }
  }
  
  if (shift.settleHash && shift.settleNetwork) {
    const txUrl = getExplorerUrl(shift.settleNetwork, 'tx', shift.settleHash);
    if (txUrl) {
      message += `🔗 [View Settlement TX](${txUrl})\n`;
    }
  }
  
  // Progress indicator for processing states
  if (['processing', 'settling'].includes(shift.status)) {
    message += `\n${getProgressBar(shift.status)}`;
  }
  
  return message;
}

/**
 * Create a text-based progress bar
 */
function getProgressBar(status: string): string {
  const stages = ['waiting', 'processing', 'settling', 'complete'];
  const currentIndex = stages.indexOf(status);
  
  if (currentIndex === -1) return '';
  
  const filled = '▓';
  const empty = '░';
  const progress = stages.map((_, i) => i <= currentIndex ? filled : empty).join('');
  
  return `Progress: ${progress} ${Math.round((currentIndex + 1) / stages.length * 100)}%`;
}

/**
 * Format status update for notifications
 */
export function formatStatusNotification(
  shiftId: string,
  oldStatus: string,
  newStatus: string,
  shift: any
): string {
  const config = STATUS_CONFIG[newStatus] || STATUS_CONFIG.pending;
  
  let message = `${config.emoji} *Swap Update*\n\n`;
  message += `Your swap is now: *${config.title}*\n`;
  message += `Shift ID: \`${shiftId}\`\n\n`;
  
  if (newStatus === 'complete') {
    message += `🎉 *Congratulations!*\n`;
    message += `${shift.settleAmount} ${shift.settleCoin.toUpperCase()} has been sent to your wallet!\n\n`;
    
    if (shift.settleHash && shift.settleNetwork) {
      const txUrl = getExplorerUrl(shift.settleNetwork, 'tx', shift.settleHash);
      if (txUrl) {
        message += `🔗 [View Transaction](${txUrl})`;
      }
    }
  } else if (newStatus === 'refunded') {
    message += `Your funds have been returned.\n`;
    if (shift.depositHash && shift.depositNetwork) {
      const txUrl = getExplorerUrl(shift.depositNetwork, 'tx', shift.depositHash);
      if (txUrl) {
        message += `🔗 [View Refund TX](${txUrl})`;
      }
    }
  }
  
  return message;
}

/**
 * Get action buttons based on status
 */
export function getStatusActionButtons(status: string, shiftId: string): any[][] {
  const buttons: any[][] = [];
  
  if (['pending', 'waiting'].includes(status)) {
    buttons.push([
      { text: '🔄 Refresh Status', callback_data: `check_status_${shiftId}` },
      { text: '❌ Cancel', callback_data: `cancel_shift_${shiftId}` }
    ]);
  } else if (['processing', 'settling'].includes(status)) {
    buttons.push([
      { text: '🔄 Refresh Status', callback_data: `check_status_${shiftId}` }
    ]);
  } else if (status === 'complete') {
    buttons.push([
      { text: '🔁 Swap Again', callback_data: 'swap_again' },
      { text: '⭐ Add to Favorites', callback_data: `add_fav_${shiftId}` }
    ]);
  } else if (['expired', 'refunded', 'rejected'].includes(status)) {
    buttons.push([
      { text: '🔁 Try Again', callback_data: 'swap_again' }
    ]);
  }
  
  return buttons;
}

export default {
  getQuoteCountdown,
  formatCountdown,
  formatEnhancedStatus,
  formatStatusNotification,
  getStatusActionButtons,
  getNetworkETA,
  STATUS_CONFIG
};
