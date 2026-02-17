// src/app/api/packing-lists/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const poId = searchParams.get('poId');

  const where = {};
  if (poId) where.poId = poId;

  const packingLists = await prisma.packingList.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      po: { select: { poNo: true, customer: { select: { name: true, code: true } } } },
      cartons: {
        orderBy: { cartonNo: 'asc' },
      },
    },
  });
  return NextResponse.json({ packingLists });
}

export async function POST(request) {
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
      notes: body.notes,
    },
    include: {
      po: { select: { poNo: true, customer: { select: { name: true } } } },
    },
  });
  return NextResponse.json(pl, { status: 201 });
}
