// src/app/api/order-costs/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getOrderPnL, getColorLevelPnL } from '@/lib/pnl';
import { toPlain } from '@/lib/serialize';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('poId');
    const breakdown = searchParams.get('breakdown'); // 'color' for line-level

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

    // Enhanced P&L using centralized library
    const orderPnL = await getOrderPnL(poId);

    const result = {
      costs: toPlain(costs),
      summary,
      pnl: orderPnL ? {
        // Legacy fields for backward compat
        revenue: orderPnL.estRevenue,
        totalCost,
        grossProfit: orderPnL.estRevenue - totalCost,
        grossMargin: orderPnL.estMargin,
        costPerUnit: orderPnL.totalQty > 0 ? (totalCost / orderPnL.totalQty).toFixed(2) : 0,
        totalQty: orderPnL.totalQty,
        // New est/actual fields
        isActual: orderPnL.isActual,
        estRevenue: orderPnL.estRevenue,
        actRevenue: orderPnL.actRevenue,
        estProfit: orderPnL.estProfit,
        actProfit: orderPnL.actProfit,
        estMargin: orderPnL.estMargin,
        actMargin: orderPnL.actMargin,
        revenueVariance: orderPnL.revenueVariance,
        invoiceCount: orderPnL.invoiceCount,
      } : {
        revenue: 0, totalCost, grossProfit: -totalCost, grossMargin: 0,
        costPerUnit: 0, totalQty: 0,
      },
    };

    // Color-level breakdown
    if (breakdown === 'color') {
      const colorPnL = await getColorLevelPnL(poId);
      if (colorPnL) {
        result.byColor = colorPnL.byColor;
        result.isActual = colorPnL.isActual;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/order-costs] error:', err);
    return NextResponse.json({ error: 'Failed to fetch order costs' }, { status: 500 });
  }
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
      poLineItemId: body.poLineItemId || null,
      notes: body.notes,
    },
  });
  return NextResponse.json(toPlain(cost), { status: 201 });
}
