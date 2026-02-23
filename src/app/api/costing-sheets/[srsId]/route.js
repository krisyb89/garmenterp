import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { normalizeLines, sumLinesLocal, sumLinesQuoted, computeSellingPrice } from '@/lib/costing';

// Build the normalized save payload from a request body
function buildCostingData(body) {
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

  return {
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
    versionLabel: body.versionLabel || null,
  };
}

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { srsId } = await params;

  // Return ALL versions ordered newest-first (full data — versions are compact enough)
  const versions = await prisma.costingSheet.findMany({
    where: { srsId },
    orderBy: { revisionNo: 'desc' },
  });

  if (versions.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ costing: versions[0], versions });
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { srsId } = await params;
  const body = await request.json();
  const data = buildCostingData(body);

  // If a specific version ID is provided, save that version; otherwise upsert by srsId (latest)
  if (body.costingId) {
    const updated = await prisma.costingSheet.update({ where: { id: body.costingId }, data });
    return NextResponse.json(updated);
  }

  // Legacy upsert path (creates v1 if none exists)
  const existing = await prisma.costingSheet.findFirst({ where: { srsId }, orderBy: { revisionNo: 'desc' } });
  if (existing) {
    const updated = await prisma.costingSheet.update({ where: { id: existing.id }, data });
    return NextResponse.json(updated);
  }

  const created = await prisma.costingSheet.create({ data: { srsId, revisionNo: 1, ...data } });
  return NextResponse.json(created);
}
