// src/app/api/inventory/movements/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        inventoryItem: {
          include: { material: { select: { code: true, name: true } } },
        },
      },
    });
    return NextResponse.json({ movements });

  } catch (error) {
    console.error('[movements:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
