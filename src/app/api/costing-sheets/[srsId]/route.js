import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { normalizeLines, sumLinesLocal, sumLinesQuoted, computeSellingPrice } from '@/lib/costing';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { srsId } = await params;
  const costing = await prisma.costingSheet.findUnique({ where: { srsId } });
  if (!costing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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

  const defaultRate = body.exchangeRate != null ? Number(body.exchangeRate) : 1;

  const segments = ['fabricDetails', 'trimDetails', 'laborDetails', 'packingDetails', 'misDetails', 'freightDetails', 'dutyDetails'];
  const segmentKeys = ['fabricCost', 'trimCost', 'laborCost', 'packingCost', 'misCost', 'freightCost', 'dutyCost'];

  const normalized = {};
  const segCosts = {};
  let totalCostLocal = 0;
  let totalCostQuoted = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const costKey = segmentKeys[i];
    const lines = normalizeLines(body[seg], defaultRate);
    normalized[seg] = lines;
    const localSum = lines.reduce((s, l) => s + l.costLocal, 0);
    const quotedSum = lines.reduce((s, l) => s + l.costQuoted, 0);
    segCosts[costKey] = quotedSum;
    totalCostLocal += localSum;
    totalCostQuoted += quotedSum;
  }

  const agentCommPercent = body.agentCommPercent != null ? Number(body.agentCommPercent) : 0;
  const targetMarginPercent = body.targetMarginPercent != null ? Number(body.targetMarginPercent) : 0;
  const agentCommAmount = totalCostQuoted * (agentCommPercent / 100);
  const sellingPrice = computeSellingPrice(totalCostQuoted, agentCommPercent, targetMarginPercent);
  const actualQuotedPrice = body.actualQuotedPrice != null && body.actualQuotedPrice !== '' ? Number(body.actualQuotedPrice) : null;

  const data = {
    ...normalized,
    ...segCosts,
    totalCostLocal,
    totalCostQuoted,
    agentCommPercent,
    agentCommAmount,
    targetMarginPercent,
    sellingPrice,
    actualQuotedPrice,
    localCurrency: body.localCurrency || 'CNY',
    quoteCurrency: body.quoteCurrency || 'USD',
    exchangeRate: defaultRate,
    pricingBasis: body.pricingBasis || 'FOB',
    notes: body.notes || null,
  };

  const updated = await prisma.costingSheet.upsert({
    where: { srsId },
    update: data,
    create: { srsId, ...data },
  });

  return NextResponse.json(updated);
}
