// src/app/api/production-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const order = await prisma.productionOrder.findUnique({
      where: { id },
      include: {
        po: { include: { customer: true } },
        factory: true,
        inspections: { orderBy: { inspectionDate: 'desc' } },
      },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(order);

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

    // Build update payload — only include explicitly allowed fields
    const data = {};
    if (body.status              !== undefined) data.status              = body.status;
    if (body.targetStartDate     !== undefined) data.targetStartDate     = body.targetStartDate ? new Date(body.targetStartDate) : null;
    if (body.targetEndDate       !== undefined) data.targetEndDate       = body.targetEndDate   ? new Date(body.targetEndDate)   : null;
    if (body.actualStartDate     !== undefined) data.actualStartDate     = body.actualStartDate ? new Date(body.actualStartDate) : null;
    if (body.actualEndDate       !== undefined) data.actualEndDate       = body.actualEndDate   ? new Date(body.actualEndDate)   : null;
    if (body.cmtRate             !== undefined) data.cmtRate             = body.cmtRate         != null ? parseFloat(body.cmtRate) : null;
    if (body.cmtCurrency         !== undefined) data.cmtCurrency         = body.cmtCurrency;
    if (body.notes               !== undefined) data.notes               = body.notes           || null;
    if (body.specialInstructions !== undefined) data.specialInstructions = body.specialInstructions || null;
    // Factory production invoice fields (for P&L cost tracking)
    if (body.prodInvoiceQty        !== undefined) data.prodInvoiceQty        = body.prodInvoiceQty        != null ? parseInt(body.prodInvoiceQty)              : null;
    if (body.prodInvoiceUnitPrice  !== undefined) data.prodInvoiceUnitPrice  = body.prodInvoiceUnitPrice  != null ? parseFloat(body.prodInvoiceUnitPrice)       : null;
    if (body.prodInvoiceCurrency   !== undefined) data.prodInvoiceCurrency   = body.prodInvoiceCurrency   || 'CNY';
    if (body.prodInvoiceTotal      !== undefined) data.prodInvoiceTotal      = body.prodInvoiceTotal      != null ? parseFloat(body.prodInvoiceTotal)           : null;
    if (body.vatRefundRate         !== undefined) data.vatRefundRate         = parseFloat(body.vatRefundRate) || 0;

    const order = await prisma.productionOrder.update({ where: { id }, data });
    return NextResponse.json(order);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Only Admin can delete
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }
    
    const { id } = await params;
    
    // Check if order exists
    const existing = await prisma.productionOrder.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Delete associated QC inspections first (cascade delete)
    await prisma.qCInspection.deleteMany({
      where: { prodOrderId: id }
    });
    
    // Delete the order
    await prisma.productionOrder.delete({ where: { id } });
    
    return NextResponse.json({ success: true, message: 'Production order deleted' });

  } catch (error) {
    console.error('[[id]:DELETE]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
