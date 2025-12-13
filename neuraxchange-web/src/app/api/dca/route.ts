import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/dca?chatId=123456
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

    const orders = await prisma.dCAOrder.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map(order => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      lastExecutedAt: order.lastExecutedAt?.toISOString() || null,
      nextExecutionAt: order.nextExecutionAt.toISOString(),
    }));

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching DCA orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/dca - Toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const order = await prisma.dCAOrder.update({
      where: { id: parseInt(id) },
      data: { isActive: isActive !== undefined ? isActive : undefined },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating DCA order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/dca?id=123
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await prisma.dCAOrder.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting DCA order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
