import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/user?chatId=123456
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { chatId: BigInt(chatId) },
      include: {
        settings: true,
        _count: {
          select: {
            swaps: true,
            alerts: { where: { isActive: true } },
            favorites: true,
            dcaOrders: { where: { isActive: true } },
            limitOrders: { where: { isActive: true } },
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Convert BigInt to string for JSON serialization
    const userData = {
      ...user,
      chatId: user.chatId.toString(),
    };

    return NextResponse.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
