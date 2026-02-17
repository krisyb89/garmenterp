// src/app/api/invoices/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');

  const where = {};
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const invoices = await prisma.customerInvoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, code: true } },
      po: { select: { poNo: true } },
      _count: { select: { payments: true } },
    },
  });
  return NextResponse.json({ invoices });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const count = await prisma.customerInvoice.count();
  const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  // Auto-generate line items from PO
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: body.poId },
    include: { lineItems: { include: { style: true } }, customer: true },
  });

  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

  const lineItems = po.lineItems.map(line => ({
    styleNo: line.style.styleNo,
    color: line.color,
    description: line.style.description || '',
    quantity: line.totalQty,
    unitPrice: parseFloat(line.unitPrice),
    lineTotal: parseFloat(line.lineTotal),
  }));

  const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
  const adjustments = parseFloat(body.adjustments || 0);
  const totalAmount = subtotal + adjustments;

  // Calculate due date if shipment has ROG
  let dueDate = null;
  const shipment = await prisma.shipment.findFirst({
    where: { poId: body.poId, rogDate: { not: null } },
    orderBy: { rogDate: 'desc' },
  });
  if (shipment?.rogDate) {
    dueDate = new Date(shipment.rogDate);
    dueDate.setDate(dueDate.getDate() + po.customer.paymentTermDays);
  }

  const invoice = await prisma.customerInvoice.create({
    data: {
      invoiceNo,
      customerId: po.customerId,
      poId: body.poId,
      currency: po.currency,
      subtotal,
      adjustments,
      totalAmount,
      amountDue: totalAmount,
      dueDate,
      bankDetails: body.bankDetails,
      notes: body.notes,
      lineItems: { create: lineItems },
    },
    include: { customer: true, lineItems: true },
  });
  return NextResponse.json(invoice, { status: 201 });
}
