// src/app/api/invoices/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const invoice = await prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        po: { select: { poNo: true, id: true } },
        shipment: { select: { shipmentNo: true, id: true, shippingTerms: true, portOfLoading: true, portOfDischarge: true, vesselName: true, containerNo: true, blNo: true, etd: true, eta: true } },
        lineItems: {
          include: {
            po: { select: { poNo: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(invoice);

  } catch (error) {
    console.error('[[id]:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // General update (status, shipping fields, etc.)
    const allowedFields = [
      'status', 'notes', 'bankDetails', 'adjustments',
      'shipperName', 'shipperAddress', 'consigneeName', 'consigneeAddress',
      'forwarderName', 'forwarderAddress', 'notifyPartyName', 'notifyPartyAddress',
      'manufacturerName', 'manufacturerAddress', 'shipToName', 'shipToAddress',
      'paymentTerms', 'salesTerms', 'referenceNo', 'containerNo', 'mid',
      'countryOfOrigin', 'incoterms', 'grossWeight', 'netWeight', 'totalCartons',
      'invoiceDate', 'dueDate',
    ];
    const updateData = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === 'invoiceDate' || key === 'dueDate') {
          updateData[key] = body[key] ? new Date(body[key]) : null;
        } else {
          updateData[key] = body[key];
        }
      }
    }

    // Recalculate totals if adjustments changed
    if (body.adjustments !== undefined) {
      const current = await prisma.customerInvoice.findUnique({ where: { id } });
      const newTotal = parseFloat(current.subtotal) + parseFloat(body.adjustments);
      updateData.totalAmount = newTotal;
      updateData.amountDue = newTotal - parseFloat(current.amountPaid);
    }

    const invoice = await prisma.customerInvoice.update({ where: { id }, data: updateData });
    return NextResponse.json(invoice);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
