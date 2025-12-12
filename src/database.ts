import { PrismaClient } from '@prisma/client';

// Global Prisma client instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// User operations
export async function getOrCreateUser(chatId: number, username?: string, firstName?: string, lastName?: string) {
  return prisma.user.upsert({
    where: { chatId: BigInt(chatId) },
    update: { username, firstName, lastName },
    create: { chatId: BigInt(chatId), username, firstName, lastName }
  });
}

export async function getUserByChatId(chatId: number) {
  return prisma.user.findUnique({
    where: { chatId: BigInt(chatId) }
  });
}

// Alert operations
export async function createAlert(chatId: number, fromCoin: string, toCoin: string, targetRate: number, direction: 'above' | 'below') {
  const user = await getOrCreateUser(chatId);
  return prisma.alert.create({
    data: {
      userId: user.id,
      fromCoin: fromCoin.toLowerCase(),
      toCoin: toCoin.toLowerCase(),
      targetRate,
      direction
    }
  });
}

export async function getUserAlerts(chatId: number) {
  const user = await getUserByChatId(chatId);
  if (!user) return [];
  
  return prisma.alert.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getActiveAlerts() {
  return prisma.alert.findMany({
    where: { isActive: true },
    include: { user: true }
  });
}

export async function triggerAlert(alertId: number) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { 
      isActive: false, 
      triggered: true,
      triggeredAt: new Date()
    }
  });
}

export async function deleteAlert(alertId: number, chatId: number) {
  const user = await getUserByChatId(chatId);
  if (!user) return null;
  
  return prisma.alert.deleteMany({
    where: { id: alertId, userId: user.id }
  });
}

export async function deleteUserAlert(chatId: number, alertId: number) {
  const user = await getUserByChatId(chatId);
  if (!user) return false;
  
  const result = await prisma.alert.deleteMany({
    where: { id: alertId, userId: user.id }
  });
  
  return result.count > 0;
}

// Swap operations
export async function createSwapRecord(
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
  const user = await getOrCreateUser(chatId);
  return prisma.swap.create({
    data: {
      userId: user.id,
      shiftId,
      fromCoin: fromCoin.toLowerCase(),
      toCoin: toCoin.toLowerCase(),
      depositAmount,
      settleAddress,
      fromNetwork: options?.fromNetwork,
      toNetwork: options?.toNetwork,
      settleAmount: options?.settleAmount,
      depositAddress: options?.depositAddress,
      refundAddress: options?.refundAddress,
      rate: options?.rate
    }
  });
}

export async function updateSwapStatus(shiftId: string, status: string, settleAmount?: string, completedAt?: Date) {
  return prisma.swap.update({
    where: { shiftId },
    data: { 
      status,
      ...(settleAmount && { settleAmount }),
      ...(completedAt && { completedAt })
    }
  });
}

export async function getSwapByShiftId(shiftId: string) {
  return prisma.swap.findUnique({
    where: { shiftId },
    include: { user: true }
  });
}

export async function getUserSwaps(chatId: number, limit: number = 10) {
  const user = await getUserByChatId(chatId);
  if (!user) return [];
  
  return prisma.swap.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function getUserSwapStats(chatId: number) {
  const user = await getUserByChatId(chatId);
  if (!user) return null;
  
  const swaps = await prisma.swap.findMany({
    where: { userId: user.id }
  });
  
  const totalSwaps = swaps.length;
  const completedSwaps = swaps.filter((s: any) => s.status === 'complete').length;
  const pendingSwaps = swaps.filter((s: any) => !['complete', 'expired', 'refunded', 'rejected'].includes(s.status)).length;
  
  // Group by pair
  const pairCounts: { [key: string]: number } = {};
  swaps.forEach((s: any) => {
    const pair = `${s.fromCoin.toUpperCase()}/${s.toCoin.toUpperCase()}`;
    pairCounts[pair] = (pairCounts[pair] || 0) + 1;
  });
  
  const favoritePair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0];
  
  return {
    totalSwaps,
    completedSwaps,
    pendingSwaps,
    favoritePair: favoritePair ? favoritePair[0] : null
  };
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
