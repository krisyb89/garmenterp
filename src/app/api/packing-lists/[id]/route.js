// src/app/api/packing-lists/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const pl = await prisma.packingList.findUnique({
    where: { id },
    include: {
      po: { include: { customer: true, lineItems: { include: { style: true } } } },
      shipment: { select: { shipmentNo: true, status: true } },
      cartons: {
        orderBy: { cartonNo: 'asc' },
      },
    },
  });

  if (!pl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(pl);
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.packingList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
