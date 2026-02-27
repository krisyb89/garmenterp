// src/app/api/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkPermission, getPOForAuth } from '@/lib/authorization';
import { logPOChange } from '@/lib/audit';
import { getOrderPnL, getColorLevelPnL } from '@/lib/pnl';
import { toPlain } from '@/lib/serialize';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // ── Lightweight path: only line items needed for package/selector dropdowns ──
    if (searchParams.get('lineItemsOnly') === 'true') {
      const lineItems = await prisma.pOLineItem.findMany({
        where: { poId: id },
        select: {
          id:    true,
          color: true,
          style: { select: { styleNo: true } },
        },
      });
      return NextResponse.json({ lineItems });
    }

    // Run all queries in parallel — each include in Prisma generates a separate
    // sequential round-trip to the DB; Promise.all fires them all at once.
    const [po, productionOrders, shipments, orderCosts] = await Promise.all([
      prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          customer: { select: { name: true } },
          lineItems: {
            select: {
              id: true, color: true, colorCode: true, unitPrice: true,
              sizeBreakdown: true, shippingOrders: true, deliveryDate: true, notes: true,
              style: { select: { styleNo: true } },
            },
          },
        },
      }),
      prisma.productionOrder.findMany({
        where: { poId: id },
        select: {
          id: true, prodOrderNo: true, status: true,
          factory: { select: { name: true, country: true } },
        },
      }),
      prisma.shipment.findMany({
        where: { poId: id },
        select: { id: true, shipmentNo: true, status: true, shipmentMethod: true, vesselName: true },
      }),
      prisma.orderCost.findMany({
        where: { poId: id },
        select: { id: true, category: true, description: true, supplierName: true, totalCost: true, currency: true, exchangeRate: true, totalCostBase: true, notes: true },
        orderBy: { category: 'asc' },
      }),
    ]);

    if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

    // Enhanced P&L with est/actual and color-level breakdown
    const [orderPnL, colorPnL] = await Promise.all([
      getOrderPnL(id),
      getColorLevelPnL(id),
    ]);

    const totalCosts = orderCosts.reduce((sum, c) => sum + (parseFloat(c.totalCostBase) || 0), 0);

    return NextResponse.json(toPlain({
      ...po,
      productionOrders,
      shipments,
      orderCosts,
      pnl: orderPnL ? {
        // Legacy fields for backward compat
        revenue: orderPnL.estRevenue,
        totalCosts: orderPnL.netCosts,
        grossProfit: orderPnL.estProfit,
        grossMargin: orderPnL.estMargin,
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
        costSummary: orderPnL.costSummary,
        // Cost breakdown
        orderCostTotal: orderPnL.orderCostTotal,
        productionCostTotal: orderPnL.productionCostTotal,
        vatRefund: orderPnL.vatRefund,
        netCosts: orderPnL.netCosts,
        // Production orders with invoice details (for Cost Details segment display)
        productionOrders: orderPnL.productionOrders,
      } : { revenue: 0, totalCosts, grossProfit: -totalCosts, grossMargin: 0, productionOrders: [] },
      colorPnL: colorPnL?.byColor || [],
    }));
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

    // Build header update object — only include defined fields
    const updateData = { lastModifiedByUserId: user.id };
    if (body.status            !== undefined) updateData.status            = body.status;
    if (body.shipByDate        !== undefined) updateData.shipByDate        = body.shipByDate ? new Date(body.shipByDate) : null;
    if (body.cancelDate        !== undefined) updateData.cancelDate        = body.cancelDate ? new Date(body.cancelDate) : null;
    if (body.ihDate            !== undefined) updateData.ihDate            = body.ihDate     ? new Date(body.ihDate)     : null;
    if (body.shippingTerms     !== undefined) updateData.shippingTerms     = body.shippingTerms;
    if (body.notes             !== undefined) updateData.notes             = body.notes             || null;
    if (body.specialInstructions !== undefined) updateData.specialInstructions = body.specialInstructions || null;
    if (body.revisionNo        !== undefined) updateData.revisionNo        = body.revisionNo;
    if (body.store             !== undefined) updateData.store             = body.store             || null;
    if (body.brand             !== undefined) updateData.brand             = body.brand             || null;
    if (body.exchangeRate      !== undefined) updateData.exchangeRate      = parseFloat(body.exchangeRate) || 1;

    // If line items are provided, update all in parallel and recalculate totals
    if (Array.isArray(body.lineItems) && body.lineItems.length > 0) {
      const processed = body.lineItems.map(line => {
        const sizeBreakdown = line.sizeBreakdown || {};
        const lineQty   = Object.values(sizeBreakdown).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
        const lineTotal = lineQty * parseFloat(line.unitPrice || 0);
        const shippingOrders = Array.isArray(line.shippingOrders)
          ? line.shippingOrders.map(({ soNo, dc, address, sizeBreakdown: sb }) => ({
              soNo: soNo || '', dc: dc || '', address: address || '',
              sizeBreakdown: Object.fromEntries(
                Object.entries(sb || {}).map(([k, v]) => [k, parseInt(v) || 0])
              ),
            }))
          : null;
        return { id: line.id, sizeBreakdown, lineQty, lineTotal, shippingOrders, line };
      });

      // Run all line item updates in parallel
      await Promise.all(
        processed.map(({ id, sizeBreakdown, lineQty, lineTotal, shippingOrders, line }) =>
          prisma.pOLineItem.update({
            where: { id },
            data: {
              color:          line.color,
              colorCode:      line.colorCode || null,
              unitPrice:      parseFloat(line.unitPrice || 0),
              sizeBreakdown,
              totalQty:       lineQty,
              lineTotal,
              shippingOrders,
              deliveryDate:   line.deliveryDate ? new Date(line.deliveryDate) : null,
              notes:          line.notes || null,
            },
          })
        )
      );

      updateData.totalQty    = processed.reduce((s, p) => s + p.lineQty,   0);
      updateData.totalAmount = processed.reduce((s, p) => s + p.lineTotal,  0);
    }

    const po = await prisma.purchaseOrder.update({ where: { id }, data: updateData });

    // Phase 0: Log activity
    await logPOChange(user, 'UPDATE', po.id, beforePO, po, request);

    return NextResponse.json(po);
  } catch (error) {
    console.error('PO PUT error:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
}
