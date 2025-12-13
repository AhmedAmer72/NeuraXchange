import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/favorites?chatId=123
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
    
    const favorites = await prisma.favoritePair.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    
    // Serialize dates
    const serializedFavorites = favorites.map(fav => ({
      ...fav,
      createdAt: fav.createdAt.toISOString(),
    }));
    
    return NextResponse.json(serializedFavorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/favorites?chatId=123&id=1
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  const id = searchParams.get('id');
  
  if (!chatId || !id) {
    return NextResponse.json({ error: 'chatId and id required' }, { status: 400 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { chatId: BigInt(chatId) },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Verify ownership
    const favorite = await prisma.favoritePair.findFirst({
      where: { 
        id: parseInt(id),
        userId: user.id 
      },
    });
    
    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }
    
    await prisma.favoritePair.delete({
      where: { id: parseInt(id) },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
