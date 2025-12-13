// Type definitions for the dashboard

export interface User {
  id: number;
  chatId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  language: string;
  referralCode: string | null;
  referredBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Swap {
  id: number;
  shiftId: string;
  userId: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork: string | null;
  toNetwork: string | null;
  depositAmount: string;
  settleAmount: string | null;
  depositAddress: string | null;
  settleAddress: string;
  refundAddress: string | null;
  status: string;
  rate: string | null;
  depositHash: string | null;
  settleHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface Alert {
  id: number;
  userId: number;
  fromCoin: string;
  toCoin: string;
  targetRate: number;
  direction: 'above' | 'below';
  isActive: boolean;
  triggered: boolean;
  createdAt: Date;
  triggeredAt: Date | null;
}

export interface LimitOrder {
  id: number;
  userId: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork: string | null;
  toNetwork: string | null;
  amount: string;
  targetRate: number;
  direction: string;
  settleAddress: string;
  refundAddress: string | null;
  isActive: boolean;
  executedAt: Date | null;
  shiftId: string | null;
  createdAt: Date;
}

export interface DCAOrder {
  id: number;
  userId: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork: string | null;
  toNetwork: string | null;
  amount: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  settleAddress: string;
  refundAddress: string | null;
  isActive: boolean;
  totalExecutions: number;
  maxExecutions: number | null;
  lastExecutedAt: Date | null;
  nextExecutionAt: Date;
  createdAt: Date;
}

export interface FavoritePair {
  id: number;
  userId: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork: string | null;
  toNetwork: string | null;
  label: string | null;
  createdAt: Date;
}

export interface DashboardStats {
  totalSwaps: number;
  completedSwaps: number;
  pendingSwaps: number;
  activeAlerts: number;
  activeDCA: number;
  activeLimitOrders: number;
  totalVolume: number;
  referralCount: number;
  referralEarnings: number;
}

export interface UserSession {
  userId: number;
  chatId: string;
  username: string | null;
  firstName: string | null;
}
