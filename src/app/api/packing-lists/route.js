// src/app/api/packing-lists/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('poId');
    const status = searchParams.get('status');

    const unassigned = searchParams.get('unassigned');

    const where = {};
    if (poId) where.poId = poId;
    if (status) where.status = status;
    if (unassigned === 'true') where.shipmentId = null;

    const packingLists = await prisma.packingList.findMany({
      where,
      orderBy: [{ exFtyDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        po: { select: { poNo: true, customer: { select: { name: true, code: true } } } },
        shipment: { select: { id: true, shipmentNo: true, status: true } },
        cartons: {
          orderBy: { cartonNo: 'asc' },
        },
      },
    });
    return NextResponse.json({ packingLists });

  } catch (error) {
    console.error('[packing-lists:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.poId) {
      return NextResponse.json({ error: 'poId is required' }, { status: 400 });
    }

    // Verify PO exists
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: body.poId },
      select: { id: true },
    });
    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

    const count = await prisma.packingList.count();
    const packingListNo = `PL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const pl = await prisma.packingList.create({
      data: {
        packingListNo,
        poId: body.poId,
        shipmentId: body.shipmentId || null,
        exFtyDate: body.exFtyDate ? new Date(body.exFtyDate) : null,
        status: body.status || 'IN_PROGRESS',
        createdByUserId: user.userId || null,
        notes: body.notes,
      },
      include: {
        po: { select: { poNo: true, customer: { select: { name: true } } } },
      },
    });
    return NextResponse.json(pl, { status: 201 });

  } catch (error) {
    console.error('[packing-lists:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
