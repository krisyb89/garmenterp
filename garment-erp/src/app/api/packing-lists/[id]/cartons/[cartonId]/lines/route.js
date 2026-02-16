// src/app/api/packing-lists/[id]/cartons/[cartonId]/lines/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Recalculate carton totals from its lines, then cascade to PL header
async function refreshCartonAndPL(cartonId) {
  const lines = await prisma.cartonLine.findMany({ where: { cartonId } });

  const totalPcs = lines.reduce((s, l) => s + l.qty, 0);
  const sizeBreakdown = {};
  for (const l of lines) {
    sizeBreakdown[l.size] = (sizeBreakdown[l.size] || 0) + l.qty;
  }

  const carton = await prisma.carton.update({
    where: { id: cartonId },
    data: { totalPcs, sizeBreakdown },
  });

  // Cascade: refresh PL header
  const allCartons = await prisma.carton.findMany({
    where: { packingListId: carton.packingListId },
  });

  await prisma.packingList.update({
    where: { id: carton.packingListId },
    data: {
      totalCartons: allCartons.length,
      totalQty: allCartons.reduce((s, c) => s + c.totalPcs, 0),
      totalGrossWeight: allCartons.reduce((s, c) => s + Number(c.grossWeight), 0),
      totalNetWeight: allCartons.reduce((s, c) => s + Number(c.netWeight), 0),
      totalCBM: allCartons.reduce((s, c) => s + Number(c.cbm), 0),
    },
  });
}

// GET — list lines for a carton
export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { cartonId } = await params;
  const lines = await prisma.cartonLine.findMany({
    where: { cartonId },
    orderBy: { size: 'asc' },
  });
  return NextResponse.json({ lines });
}

// POST — add one or more lines to a carton
export async function POST(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { cartonId } = await params;
  const body = await request.json();

  // Accept single line or array
  const incoming = Array.isArray(body) ? body : [body];

  const created = [];
  for (const l of incoming) {
    if (!l.styleNo || !l.color || !l.size || !l.qty) {
      return NextResponse.json(
        { error: 'Each line requires styleNo, color, size, qty' },
        { status: 400 }
      );
    }
    const line = await prisma.cartonLine.create({
      data: {
        cartonId,
        styleNo: l.styleNo,
        color: l.color,
        size: l.size,
        qty: parseInt(l.qty),
      },
    });
    created.push(line);
  }

  await refreshCartonAndPL(cartonId);

  return NextResponse.json({ lines: created }, { status: 201 });
}

// DELETE — remove a specific carton line (lineId as query param)
export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { cartonId } = await params;
  const { searchParams } = new URL(request.url);
  const lineId = searchParams.get('lineId');

  if (!lineId) {
    return NextResponse.json({ error: 'lineId query param required' }, { status: 400 });
  }

  await prisma.cartonLine.delete({ where: { id: lineId } });
  await refreshCartonAndPL(cartonId);

  return NextResponse.json({ success: true });
}
