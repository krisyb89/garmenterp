// src/app/api/order-costs/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const poId = searchParams.get('poId');

  if (!poId) return NextResponse.json({ error: 'poId required' }, { status: 400 });

  const costs = await prisma.orderCost.findMany({
    where: { poId },
    orderBy: { category: 'asc' },
  });

  // Calculate totals by category
  const summary = {};
  let totalCost = 0;
  costs.forEach(c => {
    const cat = c.category;
    if (!summary[cat]) summary[cat] = 0;
    summary[cat] += parseFloat(c.totalCostBase);
    totalCost += parseFloat(c.totalCostBase);
  });

  // Get PO revenue
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: { totalAmount: true, totalQty: true },
  });

  const revenue = parseFloat(po?.totalAmount || 0);
  const grossProfit = revenue - totalCost;
  const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;
  const costPerUnit = (po?.totalQty || 0) > 0 ? (totalCost / po.totalQty).toFixed(2) : 0;

  return NextResponse.json({
    costs,
    summary,
    pnl: { revenue, totalCost, grossProfit, grossMargin, costPerUnit, totalQty: po?.totalQty },
  });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const totalCostBase = parseFloat(body.totalCost || 0) * parseFloat(body.exchangeRate || 1);

  const cost = await prisma.orderCost.create({
    data: {
      poId: body.poId,
      category: body.category,
      description: body.description,
      supplierName: body.supplierName,
      quantity: body.quantity,
      unitCost: body.unitCost,
      totalCost: body.totalCost,
      currency: body.currency || 'USD',
      exchangeRate: body.exchangeRate || 1,
      totalCostBase,
      supplierPORef: body.supplierPORef,
      invoiceRef: body.invoiceRef,
      notes: body.notes,
    },
  });
  return NextResponse.json(cost, { status: 201 });
}
