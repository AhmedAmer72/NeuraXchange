// Analytics module for tracking swap volume, popular pairs, and insights
import { prisma } from './database';

export interface VolumeStats {
  totalSwaps: number;
  completedSwaps: number;
  totalVolumeUSD: number;
  last24hSwaps: number;
  last24hVolumeUSD: number;
}

export interface PairStats {
  pair: string;
  fromCoin: string;
  toCoin: string;
  count: number;
  totalVolume: string;
}

export interface UserStats {
  totalSwaps: number;
  completedSwaps: number;
  pendingSwaps: number;
  favoritePair: string | null;
  totalVolume: { [coin: string]: number };
  firstSwapDate: Date | null;
  lastSwapDate: Date | null;
}

// Approximate USD prices for volume calculation (updated periodically)
const APPROX_USD_PRICES: { [coin: string]: number } = {
  btc: 100000,
  eth: 4000,
  sol: 200,
  usdt: 1,
  usdc: 1,
  dai: 1,
  bnb: 700,
  xrp: 2.5,
  doge: 0.4,
  ltc: 100,
  matic: 0.5,
  avax: 45,
  ada: 1,
  dot: 8,
};

/**
 * Get approximate USD value for an amount
 */
function getUSDValue(coin: string, amount: string): number {
  const price = APPROX_USD_PRICES[coin.toLowerCase()] || 1;
  return parseFloat(amount) * price;
}

/**
 * Get global swap statistics
 */
export async function getGlobalStats(): Promise<VolumeStats> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [allSwaps, last24hSwaps] = await Promise.all([
    prisma.swap.findMany(),
    prisma.swap.findMany({
      where: { createdAt: { gte: yesterday } }
    })
  ]);

  let totalVolumeUSD = 0;
  let last24hVolumeUSD = 0;

  allSwaps.forEach(swap => {
    totalVolumeUSD += getUSDValue(swap.fromCoin, swap.depositAmount);
  });

  last24hSwaps.forEach(swap => {
    last24hVolumeUSD += getUSDValue(swap.fromCoin, swap.depositAmount);
  });

  return {
    totalSwaps: allSwaps.length,
    completedSwaps: allSwaps.filter(s => s.status === 'complete').length,
    totalVolumeUSD: Math.round(totalVolumeUSD),
    last24hSwaps: last24hSwaps.length,
    last24hVolumeUSD: Math.round(last24hVolumeUSD),
  };
}

/**
 * Get most popular trading pairs
 */
export async function getPopularPairs(limit: number = 10): Promise<PairStats[]> {
  const swaps = await prisma.swap.findMany({
    select: {
      fromCoin: true,
      toCoin: true,
      depositAmount: true,
    }
  });

  const pairCounts: { [pair: string]: { count: number; volume: number; from: string; to: string } } = {};

  swaps.forEach(swap => {
    const pair = `${swap.fromCoin.toUpperCase()}/${swap.toCoin.toUpperCase()}`;
    if (!pairCounts[pair]) {
      pairCounts[pair] = { count: 0, volume: 0, from: swap.fromCoin, to: swap.toCoin };
    }
    pairCounts[pair].count++;
    pairCounts[pair].volume += parseFloat(swap.depositAmount);
  });

  return Object.entries(pairCounts)
    .map(([pair, stats]) => ({
      pair,
      fromCoin: stats.from,
      toCoin: stats.to,
      count: stats.count,
      totalVolume: stats.volume.toFixed(8),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get user's detailed statistics
 */
export async function getUserAnalytics(chatId: number): Promise<UserStats | null> {
  const user = await prisma.user.findUnique({
    where: { chatId: BigInt(chatId) },
    include: { swaps: true }
  });

  if (!user || user.swaps.length === 0) {
    return null;
  }

  const swaps = user.swaps;
  const pairCounts: { [pair: string]: number } = {};
  const volumeByCooin: { [coin: string]: number } = {};

  swaps.forEach(swap => {
    const pair = `${swap.fromCoin.toUpperCase()}/${swap.toCoin.toUpperCase()}`;
    pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    volumeByCooin[swap.fromCoin.toUpperCase()] = 
      (volumeByCooin[swap.fromCoin.toUpperCase()] || 0) + parseFloat(swap.depositAmount);
  });

  const favoritePairEntry = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0];
  const sortedSwaps = swaps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return {
    totalSwaps: swaps.length,
    completedSwaps: swaps.filter(s => s.status === 'complete').length,
    pendingSwaps: swaps.filter(s => !['complete', 'expired', 'refunded', 'rejected'].includes(s.status)).length,
    favoritePair: favoritePairEntry ? favoritePairEntry[0] : null,
    totalVolume: volumeByCooin,
    firstSwapDate: sortedSwaps[0]?.createdAt || null,
    lastSwapDate: sortedSwaps[sortedSwaps.length - 1]?.createdAt || null,
  };
}

/**
 * Get rate comparison for a pair from recent swaps
 */
export async function getRateHistory(fromCoin: string, toCoin: string, days: number = 7): Promise<{ date: string; rate: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const swaps = await prisma.swap.findMany({
    where: {
      fromCoin: fromCoin.toLowerCase(),
      toCoin: toCoin.toLowerCase(),
      createdAt: { gte: startDate },
      rate: { not: null }
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true, rate: true }
  });

  return swaps.map(swap => ({
    date: swap.createdAt.toISOString().split('T')[0],
    rate: parseFloat(swap.rate || '0')
  }));
}

/**
 * Format analytics for display
 */
export function formatGlobalStats(stats: VolumeStats): string {
  return `📊 *Global Statistics*

🔄 Total Swaps: ${stats.totalSwaps.toLocaleString()}
✅ Completed: ${stats.completedSwaps.toLocaleString()}
💰 Total Volume: ~$${stats.totalVolumeUSD.toLocaleString()}

*Last 24 Hours*
🔄 Swaps: ${stats.last24hSwaps}
💰 Volume: ~$${stats.last24hVolumeUSD.toLocaleString()}`;
}

/**
 * Format popular pairs for display
 */
export function formatPopularPairs(pairs: PairStats[]): string {
  if (pairs.length === 0) {
    return '📊 No trading data available yet.';
  }

  let message = '🔥 *Most Popular Trading Pairs*\n\n';
  
  pairs.forEach((pair, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    message += `${medal} *${pair.pair}*\n`;
    message += `   Swaps: ${pair.count} | Volume: ${pair.totalVolume} ${pair.fromCoin.toUpperCase()}\n`;
  });

  return message;
}

/**
 * Format user analytics for display
 */
export function formatUserAnalytics(stats: UserStats): string {
  let message = `📊 *Your Analytics*\n\n`;
  message += `🔄 Total Swaps: ${stats.totalSwaps}\n`;
  message += `✅ Completed: ${stats.completedSwaps}\n`;
  message += `⏳ Pending: ${stats.pendingSwaps}\n`;
  
  if (stats.favoritePair) {
    message += `⭐ Favorite Pair: ${stats.favoritePair}\n`;
  }

  if (Object.keys(stats.totalVolume).length > 0) {
    message += `\n💰 *Total Volume*\n`;
    Object.entries(stats.totalVolume)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([coin, vol]) => {
        message += `   ${coin}: ${vol.toFixed(6)}\n`;
      });
  }

  if (stats.firstSwapDate) {
    message += `\n📅 First Swap: ${stats.firstSwapDate.toLocaleDateString()}`;
  }
  if (stats.lastSwapDate) {
    message += `\n📅 Last Swap: ${stats.lastSwapDate.toLocaleDateString()}`;
  }

  return message;
}
