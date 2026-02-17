// src/app/api/packing-lists/[id]/cartons/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Helper: recalculate packing list totals from its cartons
async function refreshPLTotals(plId) {
  const cartons = await prisma.carton.findMany({
    where: { packingListId: plId },
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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const cartons = await prisma.carton.findMany({
    where: { packingListId: id },
    orderBy: { cartonNo: 'asc' },
  });
  return NextResponse.json({ cartons });
}

// POST — add a carton
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  // Auto-assign carton number
  const maxCarton = await prisma.carton.findFirst({
    where: { packingListId: id },
    orderBy: { cartonNo: 'desc' },
    select: { cartonNo: true },
  });
  const cartonNo = body.cartonNo || (maxCarton ? maxCarton.cartonNo + 1 : 1);

  // Calculate CBM from dimensions (cm -> m3)
  const length = parseFloat(body.length || 0);
  const width = parseFloat(body.width || 0);
  const height = parseFloat(body.height || 0);
  const cbm = (length * width * height) / 1000000;

  // sizeBreakdown from body (JSON object like {"S": 10, "M": 10})
  const sizeBreakdown = body.sizeBreakdown || {};
  const totalPcs = Object.values(sizeBreakdown).reduce((s, v) => s + (parseInt(v) || 0), 0);

  const carton = await prisma.carton.create({
    data: {
      packingListId: id,
      cartonNo,
      styleNo: body.styleNo || '',
      color: body.color || '',
      sizeBreakdown,
      totalPcs,
      netWeight: parseFloat(body.netWeight || 0),
      grossWeight: parseFloat(body.grossWeight || 0),
      length: length || null,
      width: width || null,
      height: height || null,
      cbm,
    },
  });

  // Refresh PL header totals
  await refreshPLTotals(id);

  return NextResponse.json(carton, { status: 201 });
}

// DELETE — remove a carton by cartonId (passed as query param)
export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
