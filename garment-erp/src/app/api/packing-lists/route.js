// src/app/api/packing-lists/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const poId = searchParams.get('poId');

  const where = {};
  if (poId) where.poId = poId;

  const packingLists = await prisma.packingList.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, code: true } },
      po: { select: { poNo: true } },
      cartons: {
        orderBy: { cartonNo: 'asc' },
        include: { lines: true },
      },
    },
  });
  return NextResponse.json({ packingLists });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.poId) {
    return NextResponse.json({ error: 'poId is required' }, { status: 400 });
  }

  // Look up PO to get customerId
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: body.poId },
    select: { customerId: true },
  });
  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

  const count = await prisma.packingList.count();
  const packingListNo = `PL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const pl = await prisma.packingList.create({
    data: {
      packingListNo,
      poId: body.poId,
      customerId: po.customerId,
      shipmentId: body.shipmentId || null,
      notes: body.notes,
    },
    include: {
      customer: { select: { name: true } },
      po: { select: { poNo: true } },
    },
  });
  return NextResponse.json(pl, { status: 201 });
}
