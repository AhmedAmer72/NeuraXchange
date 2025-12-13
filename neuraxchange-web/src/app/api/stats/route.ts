import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/stats?chatId=123456
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { chatId: BigInt(chatId) },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all stats in parallel
    const [
      totalSwaps,
      completedSwaps,
      pendingSwaps,
      activeAlerts,
      activeDCA,
      activeLimitOrders,
      swaps,
      referralCount
    ] = await Promise.all([
      prisma.swap.count({ where: { userId: user.id } }),
      prisma.swap.count({ where: { userId: user.id, status: 'complete' } }),
      prisma.swap.count({ where: { userId: user.id, status: { in: ['pending', 'waiting', 'processing', 'settling'] } } }),
      prisma.alert.count({ where: { userId: user.id, isActive: true } }),
      prisma.dCAOrder.count({ where: { userId: user.id, isActive: true } }),
      prisma.limitOrder.count({ where: { userId: user.id, isActive: true } }),
      prisma.swap.findMany({ 
        where: { userId: user.id, status: 'complete' },
        select: { depositAmount: true, fromCoin: true }
      }),
      prisma.user.count({ where: { referredBy: user.id } })
    ]);

    // Calculate total volume (simplified - would need price data for accurate USD)
    const totalVolume = swaps.reduce((sum, swap) => {
      return sum + parseFloat(swap.depositAmount || '0');
    }, 0);

    // Referral earnings (simplified calculation)
    const referralEarnings = referralCount * 0.5; // $0.50 per referral example

    const stats = {
      totalSwaps,
      completedSwaps,
      pendingSwaps,
      activeAlerts,
      activeDCA,
      activeLimitOrders,
      totalVolume,
      referralCount,
      referralEarnings
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
