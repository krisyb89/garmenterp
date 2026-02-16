// src/app/api/packing-lists/[id]/cartons/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Helper: recalculate packing list totals from its cartons
async function refreshPLTotals(plId) {
  const cartons = await prisma.carton.findMany({
    where: { packingListId: plId },
    include: { lines: true },
  });

  const totalCartons = cartons.length;
  let totalQty = 0;
  let totalGrossWeight = 0;
  let totalNetWeight = 0;
  let totalCBM = 0;

  for (const c of cartons) {
    totalQty += c.totalPcs;
    totalGrossWeight += Number(c.grossWeight);
    totalNetWeight += Number(c.netWeight);
    totalCBM += Number(c.cbm);
  }

  await prisma.packingList.update({
    where: { id: plId },
    data: { totalCartons, totalQty, totalGrossWeight, totalNetWeight, totalCBM },
  });
}

// GET — list cartons for a packing list
export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const cartons = await prisma.carton.findMany({
    where: { packingListId: id },
    orderBy: { cartonNo: 'asc' },
    include: { lines: { orderBy: { size: 'asc' } } },
  });
  return NextResponse.json({ cartons });
}

// POST — add a carton (with optional lines)
export async function POST(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  // Auto-assign carton number
  const maxCarton = await prisma.carton.findFirst({
    where: { packingListId: id },
    orderBy: { cartonNo: 'desc' },
    select: { cartonNo: true },
  });
  const cartonNo = body.cartonNo || (maxCarton ? maxCarton.cartonNo + 1 : 1);

  // Calculate CBM from dimensions (cm → m³)
  const length = parseFloat(body.length || 0);
  const width = parseFloat(body.width || 0);
  const height = parseFloat(body.height || 0);
  const cbm = (length * width * height) / 1000000;

  // Build carton lines if provided
  const lines = (body.lines || []).map((l) => ({
    styleNo: l.styleNo,
    color: l.color,
    size: l.size,
    qty: parseInt(l.qty),
  }));

  const totalPcs = lines.reduce((s, l) => s + l.qty, 0);

  // Build denormalised sizeBreakdown from lines
  const sizeBreakdown = {};
  for (const l of lines) {
    sizeBreakdown[l.size] = (sizeBreakdown[l.size] || 0) + l.qty;
  }

  const carton = await prisma.carton.create({
    data: {
      packingListId: id,
      cartonNo,
      sizeBreakdown,
      totalPcs,
      netWeight: parseFloat(body.netWeight || 0),
      grossWeight: parseFloat(body.grossWeight || 0),
      length: length || null,
      width: width || null,
      height: height || null,
      cbm,
      lines: lines.length > 0 ? { create: lines } : undefined,
    },
    include: { lines: true },
  });

  // Refresh PL header totals
  await refreshPLTotals(id);

  return NextResponse.json(carton, { status: 201 });
}

// DELETE — remove a carton by cartonId (passed as query param)
export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cartonId = searchParams.get('cartonId');

  if (!cartonId) {
    return NextResponse.json({ error: 'cartonId query param required' }, { status: 400 });
  }

  await prisma.carton.delete({ where: { id: cartonId } });
  await refreshPLTotals(id);

  return NextResponse.json({ success: true });
}
