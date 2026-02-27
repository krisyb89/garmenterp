// src/app/api/styles/[id]/bom/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const bom = await prisma.bOMItem.findMany({
      where: { styleId: id },
      orderBy: [{ createdAt: 'asc' }],
      include: { material: { include: { category: true } } },
    });

    return NextResponse.json({ bomItems: bom });

  } catch (error) {
    console.error('[bom:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.materialId) return NextResponse.json({ error: 'materialId is required' }, { status: 400 });

    const item = await prisma.bOMItem.create({
      data: {
        styleId:         id,
        materialId:      body.materialId,
        description:     body.description || null,
        placement:       body.placement   || null,
        consumptionQty:  body.consumptionQty  ?? 0,
        consumptionUnit: body.consumptionUnit || 'MTR',
        wastagePercent:  body.wastagePercent  ?? 3,
        notes:           body.notes || null,
      },
      include: { material: { include: { category: true } } },
    });

    return NextResponse.json(item, { status: 201 });

  } catch (error) {
    console.error('[bom:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
