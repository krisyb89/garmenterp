// src/app/api/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        lineItems: { include: { style: true } },
        productionOrders: { include: { factory: true } },
        supplierPOs: { include: { supplier: true } },
        packingLists: true,
        shipments: true,
        invoices: true,
        orderCosts: { orderBy: { category: 'asc' } },
      },
    });

    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

    // Calculate order P&L
    const revenue = parseFloat(po.totalAmount) || 0;
    const totalCosts = po.orderCosts.reduce((sum, c) => sum + (parseFloat(c.totalCostBase) || 0), 0);
    const grossProfit = revenue - totalCosts;
    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;

    return NextResponse.json({ ...po, pnl: { revenue, totalCosts, grossProfit, grossMargin } });
  } catch (error) {
    console.error('PO GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch PO' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: body.status,
        shipByDate: body.shipByDate ? new Date(body.shipByDate) : undefined,
        shippingTerms: body.shippingTerms,
        notes: body.notes,
        specialInstructions: body.specialInstructions,
        revisionNo: body.revisionNo,
      },
    });

    return NextResponse.json(po);
  } catch (error) {
    console.error('PO PUT error:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
}
