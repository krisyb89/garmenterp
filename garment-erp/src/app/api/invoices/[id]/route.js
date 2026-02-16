// src/app/api/invoices/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRole, ROLE_GROUPS } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireRole(...ROLE_GROUPS.FINANCE);
  if (error) return error;
  const { id } = await params;
  const invoice = await prisma.customerInvoice.findUnique({
    where: { id },
    include: { customer: true, po: true, lineItems: true, payments: { orderBy: { paymentDate: 'desc' } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function PUT(request, { params }) {
  const { user, error } = await requireRole(...ROLE_GROUPS.FINANCE);
  if (error) return error;
  const { id } = await params;
  const body = await request.json();

  // If recording a payment
  if (body.payment) {
    const payment = await prisma.paymentReceived.create({
      data: {
        invoiceId: id,
        paymentDate: new Date(body.payment.paymentDate),
        amount: body.payment.amount,
        currency: body.payment.currency,
        exchangeRate: body.payment.exchangeRate || 1,
        amountInBase: body.payment.amount * (body.payment.exchangeRate || 1),
        bankReference: body.payment.bankReference,
        paymentMethod: body.payment.paymentMethod,
      },
    });

    // Update invoice amounts
    const invoice = await prisma.customerInvoice.findUnique({ where: { id }, include: { payments: true } });
    const totalPaid = invoice.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const amountDue = parseFloat(invoice.totalAmount) - totalPaid;

    let status = 'PARTIALLY_PAID';
    if (amountDue <= 0) status = 'FULLY_PAID';

    await prisma.customerInvoice.update({
      where: { id },
      data: { amountPaid: totalPaid, amountDue: Math.max(0, amountDue), status },
    });

    return NextResponse.json(payment);
  }

  const invoice = await prisma.customerInvoice.update({ where: { id }, data: body });
  return NextResponse.json(invoice);
}
