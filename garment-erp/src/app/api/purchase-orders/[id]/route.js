// src/app/api/purchase-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

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
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.orderDate !== undefined && body.orderDate) {
      const d = new Date(body.orderDate);
      if (!isNaN(d.getTime())) updateData.orderDate = d;
    }
    if (body.shipByDate !== undefined) updateData.shipByDate = body.shipByDate ? new Date(body.shipByDate) : null;
    if (body.cancelDate !== undefined) updateData.cancelDate = body.cancelDate ? new Date(body.cancelDate) : null;
    if (body.shippingTerms !== undefined) updateData.shippingTerms = body.shippingTerms;
    if (body.portOfLoading !== undefined) updateData.portOfLoading = body.portOfLoading;
    if (body.portOfDischarge !== undefined) updateData.portOfDischarge = body.portOfDischarge;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.specialInstructions !== undefined) updateData.specialInstructions = body.specialInstructions;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.revisionNo !== undefined) updateData.revisionNo = body.revisionNo;

    if (body.lineItems !== undefined) {
      for (const line of body.lineItems) {
        if (!line.styleId) {
          return NextResponse.json({ error: 'Each line item must have a style selected' }, { status: 400 });
        }
      }

      const po = await prisma.$transaction(async (tx) => {
        const existingLines = await tx.pOLineItem.findMany({ where: { poId: id } });
        const existingIds = new Set(existingLines.map(l => l.id));
        const incomingIds = new Set(body.lineItems.filter(l => l.id).map(l => l.id));

        const toDelete = [...existingIds].filter(eid => !incomingIds.has(eid));
        if (toDelete.length > 0) {
          await tx.pOLineItem.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (const line of body.lineItems) {
          const sizeBreakdown = line.sizeBreakdown || {};
          const totalQty = Object.values(sizeBreakdown).reduce((s, v) => s + (parseInt(v) || 0), 0);
          const unitPrice = parseFloat(line.unitPrice) || 0;
          const lineTotal = totalQty * unitPrice;

          if (line.id && existingIds.has(line.id)) {
            await tx.pOLineItem.update({
              where: { id: line.id },
              data: {
                styleId: line.styleId,
                color: line.color || '',
                colorCode: line.colorCode || null,
                unitPrice,
                sizeBreakdown,
                totalQty,
                lineTotal,
                notes: line.notes || null,
              },
            });
          } else {
            await tx.pOLineItem.create({
              data: {
                poId: id,
                styleId: line.styleId,
                color: line.color || '',
                colorCode: line.colorCode || null,
                unitPrice,
                sizeBreakdown,
                totalQty,
                lineTotal,
                notes: line.notes || null,
              },
            });
          }
        }

        const allLines = await tx.pOLineItem.findMany({ where: { poId: id } });
        const newTotalQty = allLines.reduce((s, l) => s + l.totalQty, 0);
        const newTotalAmount = allLines.reduce((s, l) => s + parseFloat(l.lineTotal), 0);

        return await tx.purchaseOrder.update({
          where: { id },
          data: { ...updateData, totalQty: newTotalQty, totalAmount: newTotalAmount },
          include: {
            customer: true,
            lineItems: { include: { style: true } },
            productionOrders: { include: { factory: true } },
            shipments: true,
            orderCosts: { orderBy: { category: 'asc' } },
          },
        });
      });

      return NextResponse.json(po);
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        lineItems: { include: { style: true } },
        productionOrders: { include: { factory: true } },
        shipments: true,
        orderCosts: { orderBy: { category: 'asc' } },
      },
    });

    return NextResponse.json(po);
  } catch (error) {
    console.error('PO PUT error:', error);
    return NextResponse.json({ error: 'Failed to update PO' }, { status: 500 });
  }
}
