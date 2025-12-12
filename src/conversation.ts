// Conversation State Manager
// Extracts conversation state management from main bot file

export type ConversationState = 
  | 'idle'
  | 'selecting_from_coin'
  | 'selecting_from_network'
  | 'selecting_to_coin'
  | 'selecting_to_network'
  | 'entering_amount'
  | 'awaiting_confirmation'
  | 'awaiting_address'
  | 'awaiting_refund_address'
  | 'polling_status'
  | 'setting_alert_from'
  | 'setting_alert_to'
  | 'setting_alert_direction'
  | 'setting_alert_rate'
  | 'setting_limit_order'
  | 'setting_dca';

export interface SwapDetails {
  fromCoin?: string;
  fromNetwork?: string;
  toCoin?: string;
  toNetwork?: string;
  amount?: string;
  quoteId?: string;
  quoteExpiresAt?: number;
  originalRate?: string;
  settleAddress?: string;
  refundAddress?: string;
  settleAmount?: string;
  fromCurrency?: string;
  toCurrency?: string;
  min?: string;
  max?: string;
}

export interface AlertDetails {
  fromCoin?: string;
  toCoin?: string;
  direction?: 'above' | 'below';
  targetRate?: number;
}

export interface LimitOrderDetails {
  fromCoin?: string;
  toCoin?: string;
  amount?: string;
  targetRate?: number;
  settleAddress?: string;
}

export interface DCADetails {
  fromCoin?: string;
  toCoin?: string;
  amount?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  settleAddress?: string;
  nextExecution?: Date;
}

export interface UserConversation {
  state: ConversationState;
  details: SwapDetails & AlertDetails & LimitOrderDetails & DCADetails;
  shiftId?: string;
  createdAt?: number;
  lastStatus?: string;
  intervalId?: NodeJS.Timeout;
  quoteTimerId?: NodeJS.Timeout;
  messageId?: number;
}

// In-memory store for conversations
const conversations: Map<number, UserConversation> = new Map();

/**
 * Get user's current conversation state
 */
export function getConversation(chatId: number): UserConversation | undefined {
  return conversations.get(chatId);
}

/**
 * Set user's conversation state
 */
export function setConversation(chatId: number, conversation: UserConversation): void {
  conversations.set(chatId, conversation);
}

/**
 * Update user's conversation state
 */
export function updateConversation(chatId: number, updates: Partial<UserConversation>): UserConversation | undefined {
  const existing = conversations.get(chatId);
  if (!existing) return undefined;
  
  const updated = {
    ...existing,
    ...updates,
    details: { ...existing.details, ...updates.details }
  };
  conversations.set(chatId, updated);
  return updated;
}

/**
 * Clear user's conversation
 */
export function clearConversation(chatId: number): void {
  const conv = conversations.get(chatId);
  if (conv) {
    // Clear any active timers
    if (conv.intervalId) clearInterval(conv.intervalId);
    if (conv.quoteTimerId) clearTimeout(conv.quoteTimerId);
  }
  conversations.delete(chatId);
}

/**
 * Get all active conversations (for cleanup)
 */
export function getAllConversations(): Map<number, UserConversation> {
  return conversations;
}

/**
 * Clear all conversations (for shutdown)
 */
export function clearAllConversations(): void {
  conversations.forEach((conv, chatId) => {
    if (conv.intervalId) clearInterval(conv.intervalId);
    if (conv.quoteTimerId) clearTimeout(conv.quoteTimerId);
  });
  conversations.clear();
}

/**
 * Start a new swap flow
 */
export function startSwapFlow(chatId: number): UserConversation {
  clearConversation(chatId);
  const conv: UserConversation = {
    state: 'selecting_from_coin',
    details: {}
  };
  conversations.set(chatId, conv);
  return conv;
}

/**
 * Check if user has active conversation
 */
export function hasActiveConversation(chatId: number): boolean {
  const conv = conversations.get(chatId);
  return conv !== undefined && conv.state !== 'idle';
}

/**
 * Get count of active swap sessions
 */
export function getActiveSwapCount(): number {
  let count = 0;
  conversations.forEach(conv => {
    if (conv.state === 'polling_status') count++;
  });
  return count;
}
