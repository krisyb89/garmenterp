// src/app/api/supplier-pos/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

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
      supplier: { select: { name: true, code: true, type: true } },
      customerPO: { select: { poNo: true, customer: { select: { name: true } } } },
      lineItems: true,
    },
  });
  return NextResponse.json({ supplierPOs: spos });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const count = await prisma.supplierPO.count();
  const spoNo = `SPO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  let totalAmount = 0;
  const lines = (body.lineItems || []).map(line => {
    const lineTotal = parseFloat(line.quantity || 0) * parseFloat(line.unitPrice || 0);
    totalAmount += lineTotal;
    return { ...line, lineTotal };
  });

  const spo = await prisma.supplierPO.create({
    data: {
      spoNo,
      supplierId: body.supplierId,
      customerPOId: body.customerPOId,
      deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
      currency: body.currency || 'CNY',
      totalAmount,
      paymentTerms: body.paymentTerms,
      notes: body.notes,
      lineItems: { create: lines },
    },
    include: { supplier: true, lineItems: true },
  });
  return NextResponse.json(spo, { status: 201 });
}
