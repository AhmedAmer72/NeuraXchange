import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/referral?chatId=123
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId required' }, { status: 400 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { chatId: BigInt(chatId) },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Count referrals by finding users who have this user's id as referredBy
    const referralCount = await prisma.user.count({
      where: { referredBy: user.id },
    });
    
    return NextResponse.json({
      referralCode: user.referralCode || `REF${chatId.slice(-6).toUpperCase()}`,
      referralCount: referralCount,
      referralEarnings: 0, // Can be calculated from swaps if needed
      referredBy: user.referredBy || null,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
