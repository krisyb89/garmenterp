// src/app/api/supplier-pos/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toPlain } from '@/lib/serialize';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const spos = await prisma.supplierPO.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier:   { select: { name: true, code: true, type: true } },
        customerPO: { select: { poNo: true, customer: { select: { name: true } } } },
        lineItems:  { select: { id: true } },   // count only for list view
      },
    });
    return NextResponse.json(toPlain({ supplierPOs: spos }));
  } catch (err) {
    console.error('[GET /api/supplier-pos] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch supplier POs' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const count = await prisma.supplierPO.count();
    const spoNo = `SPO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

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

    const spo = await prisma.supplierPO.create({
      data: {
        spoNo,
        supplierId:   body.supplierId,
        customerPOId: body.customerPOId || null,
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        currency:     body.currency || 'CNY',
        totalAmount,
        paymentTerms: body.paymentTerms || null,
        notes:        body.notes || null,
        lineItems: {
          create: lines,
        },
      },
      include: {
        supplier:   { select: { name: true, code: true } },
        lineItems:  true,
      },
    });

    return NextResponse.json(toPlain(spo), { status: 201 });
  } catch (err) {
    console.error('[POST /api/supplier-pos] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create Supplier PO' },
      { status: 500 }
    );
  }
}
