import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/swaps?chatId=123456&limit=10&offset=0
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get('chatId');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');
  
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

    const where: any = { userId: user.id };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [swaps, total] = await Promise.all([
      prisma.swap.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.swap.count({ where })
    ]);

    // Convert dates for JSON serialization
    const formattedSwaps = swaps.map(swap => ({
      ...swap,
      createdAt: swap.createdAt.toISOString(),
      updatedAt: swap.updatedAt.toISOString(),
      completedAt: swap.completedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      swaps: formattedSwaps,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error('Error fetching swaps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
