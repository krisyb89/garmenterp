// src/app/api/supplier-pos/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toPlain } from '@/lib/serialize';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const [spo, goodsReceived] = await Promise.all([
      prisma.supplierPO.findUnique({
        where:   { id },
        include: {
          supplier:   true,
          customerPO: { include: { customer: true } },
          lineItems: {
            orderBy: { createdAt: 'asc' },
            include: {
              material: { select: { code: true, name: true } },
              poLineItem: {
                select: {
                  id: true, color: true, totalQty: true,
                  po: { select: { poNo: true } },
                  style: { select: { styleNo: true } },
                },
              },
            },
          },
        },
      }),
      prisma.goodsReceived.findMany({
        where:   { supplierPOId: id },
        orderBy: { receivedDate: 'desc' },
        include: { items: true },
      }),
    ]);

    if (!spo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(toPlain({ ...spo, goodsReceived }));
  } catch (err) {
    console.error('[GET /api/supplier-pos/[id]] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load Supplier PO' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    // Check current status — block editing after goods received
    const current = await prisma.supplierPO.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const LOCKED_STATUSES = ['PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED'];
    if (LOCKED_STATUSES.includes(current.status) && body.lineItems) {
      return NextResponse.json(
        { error: 'Cannot edit line items after goods have been received. You can still change status.' },
        { status: 400 }
      );
    }

    // If only status/notes update (simple path)
    if (!body.lineItems) {
      const spo = await prisma.supplierPO.update({
        where: { id },
        data: {
          ...(body.status       !== undefined ? { status: body.status } : {}),
          ...(body.notes        !== undefined ? { notes: body.notes } : {}),
          ...(body.supplierId   !== undefined ? { supplierId: body.supplierId } : {}),
          ...(body.customerPOId !== undefined ? { customerPOId: body.customerPOId || null } : {}),
          ...(body.deliveryDate !== undefined ? { deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null } : {}),
          ...(body.currency     !== undefined ? { currency: body.currency } : {}),
          ...(body.paymentTerms !== undefined ? { paymentTerms: body.paymentTerms || null } : {}),
        },
      });
      return NextResponse.json(toPlain(spo));
    }

    // Full edit with line items — delete old lines, create new ones
    let totalAmount = 0;
    const lines = (body.lineItems || []).map(line => {
      const lineTotal = parseFloat(line.quantity || 0) * parseFloat(line.unitPrice || 0);
      totalAmount += lineTotal;
      return {
        description:   line.description || '',
        color:         line.color || null,
        quantity:      parseFloat(line.quantity),
        unit:          line.unit || 'YDS',
        unitPrice:     parseFloat(line.unitPrice),
        lineTotal,
        materialId:    line.materialId || null,
        poLineItemId:  line.poLineItemId || null,
        vatRate:       line.vatRate != null && line.vatRate !== '' ? parseFloat(line.vatRate) : null,
        vatRefundable: !!line.vatRefundable,
        notes:         line.notes || null,
      };
    });

    // Batch transaction: delete old lines + update header + create new lines
    // (batch is more reliable on Neon serverless than interactive transactions)
    await prisma.$transaction([
      prisma.supplierPOLine.deleteMany({ where: { supplierPOId: id } }),
      prisma.supplierPO.update({
        where: { id },
        data: {
          supplierId:   body.supplierId,
          customerPOId: body.customerPOId || null,
          deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
          currency:     body.currency || 'CNY',
          totalAmount,
          paymentTerms: body.paymentTerms || null,
          notes:        body.notes || null,
          status:       body.status || current.status,
          lineItems:    { create: lines },
        },
      }),
    ]);

    // Fetch the updated SPO with full includes for the response
    const spo = await prisma.supplierPO.findUnique({
      where: { id },
      include: {
        supplier:   true,
        customerPO: { include: { customer: true } },
        lineItems:  {
          orderBy: { createdAt: 'asc' },
          include: {
            material: { select: { code: true, name: true } },
            poLineItem: {
              select: {
                id: true, color: true, totalQty: true,
                po: { select: { poNo: true } },
                style: { select: { styleNo: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(toPlain(spo));
  } catch (err) {
    console.error('[PUT /api/supplier-pos/[id]] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update Supplier PO' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const spo = await prisma.supplierPO.findUnique({
      where: { id },
      select: { spoNo: true },
    });
    if (!spo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete related records that don't cascade automatically:
    // 1. OrderCost records linked to this SPO (by supplierPORef matching spoNo)
    // 2. GoodsReceivedItems (cascade from GR)
    // 3. GoodsReceived records
    // 4. SupplierPOLines (cascade from SPO)
    // 5. The SPO itself

    const operations = [
      // Delete OrderCost records that were auto-synced from this SPO
      prisma.orderCost.deleteMany({ where: { supplierPORef: spo.spoNo } }),
      // Delete GoodsReceived items (must delete items first since GR items cascade from GR)
      prisma.goodsReceivedItem.deleteMany({
        where: { goodsReceived: { supplierPOId: id } },
      }),
      // Delete GoodsReceived records
      prisma.goodsReceived.deleteMany({ where: { supplierPOId: id } }),
      // Delete the SPO itself (line items cascade)
      prisma.supplierPO.delete({ where: { id } }),
    ];

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, deleted: spo.spoNo });
  } catch (err) {
    console.error('[DELETE /api/supplier-pos/[id]] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete Supplier PO' },
      { status: 500 }
    );
  }
}
