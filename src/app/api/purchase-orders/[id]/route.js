// src/app/api/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkPermission, getPOForAuth } from '@/lib/authorization';
import { logPOChange } from '@/lib/audit';

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

    // Phase 0: Get PO for authorization check
    const existingPO = await getPOForAuth(id);
    if (!existingPO) {
      return NextResponse.json({ error: 'PO not found' }, { status: 404 });
    }

    // Phase 0: Check authorization
    const authCheck = await checkPermission(user, 'update', 'PO', existingPO);
    if (!authCheck.allowed) {
      const statusCode = authCheck.warning ? 403 : 401;
      return NextResponse.json({
        error: authCheck.reason,
        warning: authCheck.warning
      }, { status: statusCode });
    }

    // Fetch full PO for audit log
    const beforePO = await prisma.purchaseOrder.findUnique({ where: { id } });

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: body.status,
        shipByDate: body.shipByDate ? new Date(body.shipByDate) : undefined,
        shippingTerms: body.shippingTerms,
        notes: body.notes,
        specialInstructions: body.specialInstructions,
        revisionNo: body.revisionNo,
        // Phase 0: Track last modifier
        lastModifiedByUserId: user.id,
      },
    });

    // Phase 0: Log activity
    await logPOChange(user, 'UPDATE', po.id, beforePO, po, request);

    return NextResponse.json(po);
  } catch (error) {
    console.error('PO PUT error:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
}
