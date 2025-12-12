// Favorite Pairs Management
import { prisma } from './database';

export interface FavoritePair {
  id: number;
  fromCoin: string;
  toCoin: string;
  fromNetwork?: string;
  toNetwork?: string;
  label?: string;
}

/**
 * Add a favorite pair for user
 */
export async function addFavoritePair(
  chatId: number,
  fromCoin: string,
  toCoin: string,
  fromNetwork?: string,
  toNetwork?: string,
  label?: string
): Promise<FavoritePair> {
  const user = await prisma.user.findUnique({
    where: { chatId: BigInt(chatId) }
  });
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if already exists
  const existing = await prisma.$queryRaw`
    SELECT * FROM FavoritePair 
    WHERE userId = ${user.id} 
    AND fromCoin = ${fromCoin.toLowerCase()} 
    AND toCoin = ${toCoin.toLowerCase()}
  ` as any[];

  if (existing.length > 0) {
    return existing[0];
  }

  // Create via raw query since FavoritePair model might not be in schema yet
  const result = await prisma.$executeRaw`
    INSERT INTO FavoritePair (userId, fromCoin, toCoin, fromNetwork, toNetwork, label, createdAt)
    VALUES (${user.id}, ${fromCoin.toLowerCase()}, ${toCoin.toLowerCase()}, ${fromNetwork || null}, ${toNetwork || null}, ${label || null}, datetime('now'))
  `;

  return {
    id: result,
    fromCoin: fromCoin.toLowerCase(),
    toCoin: toCoin.toLowerCase(),
    fromNetwork,
    toNetwork,
    label
  };
}

/**
 * Get user's favorite pairs
 */
export async function getUserFavorites(chatId: number): Promise<FavoritePair[]> {
  const user = await prisma.user.findUnique({
    where: { chatId: BigInt(chatId) }
  });

  if (!user) return [];

  try {
    const favorites = await prisma.$queryRaw`
      SELECT * FROM FavoritePair WHERE userId = ${user.id} ORDER BY createdAt DESC
    ` as FavoritePair[];
    return favorites;
  } catch {
    // Table might not exist yet
    return [];
  }
}

/**
 * Remove a favorite pair
 */
export async function removeFavoritePair(chatId: number, favoriteId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { chatId: BigInt(chatId) }
  });

  if (!user) return false;

  try {
    await prisma.$executeRaw`
      DELETE FROM FavoritePair WHERE id = ${favoriteId} AND userId = ${user.id}
    `;
    return true;
  } catch {
    return false;
  }
}

/**
 * Format favorites for display
 */
export function formatFavorites(favorites: FavoritePair[]): string {
  if (favorites.length === 0) {
    return `⭐ *Favorite Pairs*

You haven't saved any favorite pairs yet.

After completing a swap, you can add it to favorites for quick access!`;
  }

  let message = `⭐ *Your Favorite Pairs*\n\n`;
  
  favorites.forEach((fav, index) => {
    const label = fav.label || `${fav.fromCoin.toUpperCase()} → ${fav.toCoin.toUpperCase()}`;
    message += `${index + 1}. *${label}*\n`;
    if (fav.fromNetwork || fav.toNetwork) {
      message += `   Networks: ${fav.fromNetwork || 'default'} → ${fav.toNetwork || 'default'}\n`;
    }
  });

  message += `\nTap a pair to start a quick swap!`;
  return message;
}

/**
 * Format favorites as inline keyboard
 */
export async function formatFavoritesKeyboard(chatId: number): Promise<{ inline_keyboard: Array<Array<{ text: string; callback_data: string }>> }> {
  const favorites = await getUserFavorites(chatId);
  
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
  
  for (const fav of favorites) {
    const label = fav.label || `${fav.fromCoin.toUpperCase()} → ${fav.toCoin.toUpperCase()}`;
    keyboard.push([
      { text: `🔁 ${label}`, callback_data: `fav_swap_${fav.fromCoin}_${fav.toCoin}` },
      { text: '🗑', callback_data: `fav_remove_${fav.id}` }
    ]);
  }
  
  keyboard.push([{ text: '➕ Add New Favorite', callback_data: 'fav_add_new' }]);
  
  return { inline_keyboard: keyboard };
}
