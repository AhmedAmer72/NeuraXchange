import axios from 'axios';

// Live market data and trend utilities
const SIDESHIFT_API_URL = 'https://sideshift.ai/api/v2';

// Cache for rate history (in-memory, simple implementation)
interface RateHistory {
  timestamp: number;
  rate: number;
}

const rateCache: Map<string, RateHistory[]> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_HISTORY_LENGTH = 100;

/**
 * Get current exchange rate between two coins
 */
export async function getCurrentRate(from: string, to: string): Promise<number> {
  try {
    const response = await axios.get(`${SIDESHIFT_API_URL}/pair/${from.toLowerCase()}/${to.toLowerCase()}`);
    return parseFloat(response.data.rate);
  } catch (error: any) {
    console.error(`Error fetching rate for ${from}/${to}:`, error.message);
    throw new Error(`Unable to fetch exchange rate for ${from}/${to}`);
  }
}

/**
 * Store rate in history cache
 */
function storeRate(pair: string, rate: number) {
  const history = rateCache.get(pair) || [];
  history.push({ timestamp: Date.now(), rate });
  
  // Keep only recent history
  const cutoff = Date.now() - CACHE_DURATION;
  const filtered = history.filter(h => h.timestamp > cutoff);
  
  // Limit history length
  if (filtered.length > MAX_HISTORY_LENGTH) {
    filtered.splice(0, filtered.length - MAX_HISTORY_LENGTH);
  }
  
  rateCache.set(pair, filtered);
}

/**
 * Get rate history for a trading pair
 */
function getRateHistory(pair: string): RateHistory[] {
  const history = rateCache.get(pair) || [];
  const cutoff = Date.now() - CACHE_DURATION;
  return history.filter(h => h.timestamp > cutoff);
}

/**
 * Calculate trend percentage and direction
 */
function calculateTrend(history: RateHistory[]): { trendPct: number; direction: 'up' | 'down' | 'flat' } {
  if (history.length < 2) {
    return { trendPct: 0, direction: 'flat' };
  }
  
  const oldest = history[0].rate;
  const newest = history[history.length - 1].rate;
  const change = ((newest - oldest) / oldest) * 100;
  
  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (Math.abs(change) < 0.5) {
    direction = 'flat';
  } else if (change > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }
  
  return { trendPct: Math.abs(change), direction };
}

/**
 * Get market trend for a trading pair
 * Returns trend percentage, direction, and current rate
 */
export async function getMarketTrend(
  from: string, 
  to: string
): Promise<{ trendPct: number; direction: 'up' | 'down' | 'flat'; rate: number }> {
  try {
    const pair = `${from.toLowerCase()}_${to.toLowerCase()}`;
    
    // Get current rate
    const currentRate = await getCurrentRate(from, to);
    
    // Store in history
    storeRate(pair, currentRate);
    
    // Get trend from history
    const history = getRateHistory(pair);
    const trend = calculateTrend(history);
    
    return {
      trendPct: trend.trendPct,
      direction: trend.direction,
      rate: currentRate
    };
  } catch (error: any) {
    console.error(`Error getting market trend for ${from}/${to}:`, error.message);
    // Return fallback values if API fails
    return { trendPct: 0, direction: 'flat', rate: 0 };
  }
}

/**
 * Get formatted trend message
 */
export function formatTrendMessage(trend: { trendPct: number; direction: 'up' | 'down' | 'flat'; rate: number }): string {
  const arrow = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️';
  const change = trend.trendPct > 0 ? `${trend.trendPct.toFixed(2)}%` : 'stable';
  
  if (trend.direction === 'flat') {
    return `${arrow} Market is stable`;
  }
  
  return `${arrow} Market is ${trend.direction === 'up' ? 'rising' : 'falling'} (${change})`;
}

/**
 * Compare rates between multiple pairs
 */
export async function compareRates(pairs: Array<{ from: string; to: string }>): Promise<Array<{
  from: string;
  to: string;
  rate: number;
  trend: string;
}>> {
  const results = [];
  
  for (const pair of pairs) {
    try {
      const trend = await getMarketTrend(pair.from, pair.to);
      results.push({
        from: pair.from.toUpperCase(),
        to: pair.to.toUpperCase(),
        rate: trend.rate,
        trend: formatTrendMessage(trend)
      });
    } catch (error) {
      // Skip pairs that fail
      continue;
    }
  }
  
  return results;
}

/**
 * Clear rate cache (useful for testing or memory management)
 */
export function clearRateCache() {
  rateCache.clear();
}
