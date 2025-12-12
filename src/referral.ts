// Referral System
// Earn rewards for inviting users
import { prisma, getOrCreateUser } from './database';
import crypto from 'crypto';

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number; // Users who made at least one swap
  totalEarnings: number;
  pendingEarnings: number;
}

// In-memory referral tracking (should be persisted to DB)
const referralCodes: Map<string, number> = new Map(); // code -> chatId
const userReferrals: Map<number, { referredBy?: number; referralCode: string; referredUsers: number[] }> = new Map();

/**
 * Generate a unique referral code for user
 */
export function generateReferralCode(chatId: number): string {
  const existing = userReferrals.get(chatId);
  if (existing?.referralCode) {
    return existing.referralCode;
  }

  // Generate a short, memorable code
  const code = 'NX' + crypto.randomBytes(3).toString('hex').toUpperCase();
  
  referralCodes.set(code, chatId);
  
  const userData = userReferrals.get(chatId) || { referralCode: code, referredUsers: [] };
  userData.referralCode = code;
  userReferrals.set(chatId, userData);
  
  return code;
}

/**
 * Get user's referral code
 */
export function getReferralCode(chatId: number): string {
  const userData = userReferrals.get(chatId);
  if (userData?.referralCode) {
    return userData.referralCode;
  }
  return generateReferralCode(chatId);
}

/**
 * Apply a referral code for a new user
 */
export async function applyReferralCode(newUserChatId: number, code: string): Promise<{ success: boolean; referrerChatId?: number }> {
  const referrerChatId = referralCodes.get(code.toUpperCase());
  
  if (!referrerChatId) {
    return { success: false };
  }

  // Can't refer yourself
  if (referrerChatId === newUserChatId) {
    return { success: false };
  }

  // Check if user already has a referrer
  const existingData = userReferrals.get(newUserChatId);
  if (existingData?.referredBy) {
    return { success: false };
  }

  // Apply referral
  const newUserData = existingData || { referralCode: generateReferralCode(newUserChatId), referredUsers: [] };
  newUserData.referredBy = referrerChatId;
  userReferrals.set(newUserChatId, newUserData);

  // Update referrer's referred users
  const referrerData = userReferrals.get(referrerChatId);
  if (referrerData) {
    referrerData.referredUsers.push(newUserChatId);
  }

  return { success: true, referrerChatId };
}

/**
 * Get user's referral statistics
 */
export async function getReferralStats(chatId: number): Promise<ReferralStats> {
  const userData = userReferrals.get(chatId);
  const referralCode = userData?.referralCode || generateReferralCode(chatId);
  const referredUsers = userData?.referredUsers || [];

  // Count active referrals (users who made swaps)
  let activeReferrals = 0;
  for (const referredChatId of referredUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { chatId: BigInt(referredChatId) },
        include: { swaps: { where: { status: 'complete' }, take: 1 } }
      });
      if (user?.swaps && user.swaps.length > 0) {
        activeReferrals++;
      }
    } catch {
      // Ignore errors
    }
  }

  return {
    referralCode,
    totalReferrals: referredUsers.length,
    activeReferrals,
    totalEarnings: 0, // Would integrate with affiliate earnings
    pendingEarnings: 0,
  };
}

/**
 * Record a referral reward (called when referred user completes a swap)
 */
export async function recordReferralReward(chatId: number, swapVolumeUSD: number): Promise<void> {
  const userData = userReferrals.get(chatId);
  if (!userData?.referredBy) return;

  // Reward rate: 0.1% of swap volume to referrer
  const rewardAmount = swapVolumeUSD * 0.001;
  
  // Log reward (in production, this would update a rewards table)
  console.log(`Referral reward: User ${userData.referredBy} earned $${rewardAmount.toFixed(2)} from referral ${chatId}`);
}

/**
 * Format referral info for display
 */
export function formatReferralInfo(stats: ReferralStats, botUsername: string): string {
  const referralLink = `https://t.me/${botUsername}?start=ref_${stats.referralCode}`;
  
  return `🎁 *Referral Program*

📋 Your Code: \`${stats.referralCode}\`

🔗 Your Link:
${referralLink}

📊 *Your Stats*
👥 Total Referrals: ${stats.totalReferrals}
✅ Active Users: ${stats.activeReferrals}
💰 Total Earned: $${stats.totalEarnings.toFixed(2)}
⏳ Pending: $${stats.pendingEarnings.toFixed(2)}

*How it works:*
1. Share your referral link with friends
2. When they sign up and swap, you both earn rewards!
3. Earn 0.1% of their swap volume

Tap the code above to copy!`;
}

/**
 * Parse referral code from start parameter
 */
export function parseReferralFromStart(startParam: string): string | null {
  if (startParam.startsWith('ref_')) {
    return startParam.substring(4).toUpperCase();
  }
  return null;
}
