// src/app/api/costing-sheets/[srsId]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { normalizeLines, sumLines } from '@/lib/costing';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { srsId } = await params;
  const costing = await prisma.costingSheet.findUnique({ where: { srsId } });
  if (!costing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Provide materials list for dropdowns
  const materials = await prisma.material.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, pricePerMeter: true, vatPercent: true, category: { select: { name: true } }, content: true, widthMeters: true, gsm: true },
    orderBy: { code: 'asc' },
  });

  return NextResponse.json({ costing, materials });
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { srsId } = await params;
  const body = await request.json();

  const fabricDetails = normalizeLines(body.fabricDetails);
  const trimDetails = normalizeLines(body.trimDetails);
  const laborDetails = normalizeLines(body.laborDetails);
  const packingDetails = normalizeLines(body.packingDetails);
  const misDetails = normalizeLines(body.misDetails);
  const freightDetails = normalizeLines(body.freightDetails);
  const dutyDetails = normalizeLines(body.dutyDetails);

  const fabricCost = sumLines(fabricDetails);
  const trimCost = sumLines(trimDetails);
  const laborCost = sumLines(laborDetails);
  const packingCost = sumLines(packingDetails);
  const misCost = sumLines(misDetails);
  const freightCost = sumLines(freightDetails);
  const dutyCost = sumLines(dutyDetails);

  const totalCostPerUnit = fabricCost + trimCost + laborCost + packingCost + misCost + freightCost + dutyCost;

  const agentCommPercent = body.agentCommPercent != null ? Number(body.agentCommPercent) : 0;
  const targetMarginPercent = body.targetMarginPercent != null ? Number(body.targetMarginPercent) : 0;
  const agentCommAmount = totalCostPerUnit * (agentCommPercent / 100);
  const sellingPrice = (totalCostPerUnit + agentCommAmount) * (1 + targetMarginPercent / 100);

  const updated = await prisma.costingSheet.upsert({
    where: { srsId },
    update: {
      fabricDetails,
      trimDetails,
      laborDetails,
      packingDetails,
      misDetails,
      freightDetails,
      dutyDetails,
      fabricCost,
      trimCost,
      laborCost,
      packingCost,
      misCost,
      freightCost,
      dutyCost,
      totalCostPerUnit,
      agentCommPercent,
      agentCommAmount,
      targetMarginPercent,
      sellingPrice,
      currency: body.currency || 'USD',
      pricingBasis: body.pricingBasis || 'FOB',
      notes: body.notes || null,
    },
    create: {
      srsId,
      fabricDetails,
      trimDetails,
      laborDetails,
      packingDetails,
      misDetails,
      freightDetails,
      dutyDetails,
      fabricCost,
      trimCost,
      laborCost,
      packingCost,
      misCost,
      freightCost,
      dutyCost,
      totalCostPerUnit,
      agentCommPercent,
      agentCommAmount,
      targetMarginPercent,
      sellingPrice,
      currency: body.currency || 'USD',
      pricingBasis: body.pricingBasis || 'FOB',
      notes: body.notes || null,
    },
  });

  return NextResponse.json(updated);
}
