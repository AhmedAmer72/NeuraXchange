import { prisma } from './database';

// In-memory cache for hot data (faster than DB)
const memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  COINS_LIST: 5 * 60 * 1000,      // 5 minutes
  PAIR_RATE: 30 * 1000,           // 30 seconds
  PAIR_LIMITS: 2 * 60 * 1000,     // 2 minutes
  COIN_INFO: 10 * 60 * 1000,      // 10 minutes
};

/**
 * Get value from memory cache
 */
export function getFromMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  
  return entry.value as T;
}

/**
 * Set value in memory cache
 */
export function setInMemoryCache<T>(key: string, value: T, ttlMs: number): void {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

/**
 * Get value from database cache (for persistence across restarts)
 */
export async function getFromDbCache<T>(key: string): Promise<T | null> {
  try {
    const entry = await prisma.cacheEntry.findUnique({
      where: { key }
    });
    
    if (!entry) return null;
    
    if (new Date() > entry.expiresAt) {
      // Clean up expired entry
      await prisma.cacheEntry.delete({ where: { key } }).catch(() => {});
      return null;
    }
    
    return JSON.parse(entry.value) as T;
  } catch (error) {
    console.error('Cache DB read error:', error);
    return null;
  }
}

/**
 * Set value in database cache
 */
export async function setInDbCache<T>(key: string, value: T, ttlMs: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlMs);
    const jsonValue = JSON.stringify(value);
    
    await prisma.cacheEntry.upsert({
      where: { key },
      update: { value: jsonValue, expiresAt },
      create: { key, value: jsonValue, expiresAt }
    });
  } catch (error) {
    console.error('Cache DB write error:', error);
  }
}

/**
 * Hybrid cache - check memory first, then DB
 */
export async function getCached<T>(key: string): Promise<T | null> {
  // Check memory first
  const memResult = getFromMemoryCache<T>(key);
  if (memResult !== null) {
    return memResult;
  }
  
  // Check DB
  const dbResult = await getFromDbCache<T>(key);
  if (dbResult !== null) {
    // Populate memory cache from DB result
    setInMemoryCache(key, dbResult, CACHE_TTL.PAIR_RATE);
    return dbResult;
  }
  
  return null;
}

/**
 * Set in both caches
 */
export async function setCached<T>(key: string, value: T, ttlMs: number, persistToDb: boolean = false): Promise<void> {
  setInMemoryCache(key, value, ttlMs);
  
  if (persistToDb) {
    await setInDbCache(key, value, ttlMs);
  }
}

/**
 * Clear expired entries from DB cache
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const result = await prisma.cacheEntry.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}

/**
 * Clear specific cache key
 */
export function clearCache(key: string): void {
  memoryCache.delete(key);
}

/**
 * Clear all memory cache
 */
export function clearAllMemoryCache(): void {
  memoryCache.clear();
}

// Cache key generators
export const CacheKeys = {
  coinsList: () => 'coins:list',
  pairRate: (from: string, to: string) => `rate:${from.toLowerCase()}:${to.toLowerCase()}`,
  pairLimits: (from: string, to: string) => `limits:${from.toLowerCase()}:${to.toLowerCase()}`,
  coinInfo: (coin: string) => `coin:${coin.toLowerCase()}`,
  coinNetworks: (coin: string) => `networks:${coin.toLowerCase()}`,
};
