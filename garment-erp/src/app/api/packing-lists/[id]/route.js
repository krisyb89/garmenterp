// src/app/api/packing-lists/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const pl = await prisma.packingList.findUnique({
    where: { id },
    include: {
      customer: true,
      po: { include: { lineItems: { include: { style: true } } } },
      shipment: { select: { shipmentNo: true, status: true } },
      cartons: {
        orderBy: { cartonNo: 'asc' },
        include: { lines: { orderBy: { size: 'asc' } } },
      },
    },
  });

  if (!pl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Compute summary by style/color/size across all cartons
  const summary = {};
  for (const carton of pl.cartons) {
    for (const line of carton.lines) {
      const key = `${line.styleNo}|${line.color}|${line.size}`;
      summary[key] = (summary[key] || 0) + line.qty;
    }
  }

  return NextResponse.json({ ...pl, summary });
}

export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  await prisma.packingList.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
