// src/app/api/styles/[id]/bom/[bomId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bomId } = await params;
    const body = await request.json();

    const item = await prisma.bOMItem.update({
      where: { id: bomId },
      data: {
        materialId:      body.materialId,
        description:     body.description     || null,
        placement:       body.placement       || null,
        consumptionQty:  body.consumptionQty  ?? 0,
        consumptionUnit: body.consumptionUnit || 'MTR',
        wastagePercent:  body.wastagePercent  ?? 3,
        notes:           body.notes           || null,
      },
      include: { material: { include: { category: true } } },
    });

    return NextResponse.json(item);

  } catch (error) {
    console.error('[[bomId]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bomId } = await params;
    await prisma.bOMItem.delete({ where: { id: bomId } });
    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[[bomId]:DELETE]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
