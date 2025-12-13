import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/settings?chatId=123
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId required' }, { status: 400 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { chatId: BigInt(chatId) },
      include: { settings: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        chatId: chatId,
        username: user.username,
        firstName: user.firstName,
      },
      settings: user.settings ? {
        defaultFromCoin: user.settings.defaultFromCoin,
        defaultToCoin: user.settings.defaultToCoin,
        notificationsEnabled: user.settings.notifications,
        language: user.settings.language || 'en',
      } : null,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/settings?chatId=123
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');
  
  if (!chatId) {
    return NextResponse.json({ error: 'chatId required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    
    const user = await prisma.user.findUnique({
      where: { chatId: BigInt(chatId) },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Upsert settings (using existing schema fields)
    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        defaultFromCoin: body.defaultFromCoin,
        defaultToCoin: body.defaultToCoin,
        notifications: body.notificationsEnabled ?? true,
        language: body.language,
      },
      create: {
        userId: user.id,
        defaultFromCoin: body.defaultFromCoin,
        defaultToCoin: body.defaultToCoin,
        notifications: body.notificationsEnabled ?? true,
        language: body.language || 'en',
      },
    });
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
