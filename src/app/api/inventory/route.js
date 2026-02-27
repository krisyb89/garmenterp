// src/app/api/inventory/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const materialId = searchParams.get('materialId');

    const where = {};
    if (location) where.location = location;
    if (materialId) where.materialId = materialId;

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        material: { select: { code: true, name: true, category: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ items });

  } catch (error) {
    console.error('[inventory:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
