import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatCrypto(value: string | number, symbol: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(8).replace(/\.?0+$/, '')} ${symbol.toUpperCase()}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    waiting: 'bg-blue-100 text-blue-800',
    processing: 'bg-orange-100 text-orange-800',
    settling: 'bg-purple-100 text-purple-800',
    complete: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
    expired: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
}

export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    pending: '⏳',
    waiting: '📥',
    processing: '🔄',
    settling: '📤',
    complete: '✅',
    completed: '✅',
    refunded: '↩️',
    expired: '⏰',
    rejected: '❌',
  };
  return icons[status.toLowerCase()] || '❓';
}

export function getCoinIcon(coin: string): string {
  const icons: Record<string, string> = {
    btc: '₿',
    eth: 'Ξ',
    sol: '◎',
    usdt: '💵',
    usdc: '💵',
    dai: '◈',
    xrp: '✕',
    doge: '🐕',
    ltc: 'Ł',
    bnb: '🔶',
  };
  return icons[coin.toLowerCase()] || '🪙';
}
