// src/app/api/shipments/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        po: { include: { customer: true } },
        packingLists: {
          include: {
            cartons: true,
            po: { select: { id: true, poNo: true, customer: { select: { id: true, name: true, code: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        documents: true,
      },
    });
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(shipment);

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

    // If ROG date is being set, auto-calculate invoice due dates
    const updateData = { ...body };
    if (body.rogDate) updateData.rogDate = new Date(body.rogDate);
    if (body.atd) updateData.atd = new Date(body.atd);
    if (body.ata) updateData.ata = new Date(body.ata);
    if (body.etd) updateData.etd = new Date(body.etd);
    if (body.eta) updateData.eta = new Date(body.eta);

    const shipment = await prisma.shipment.update({ where: { id }, data: updateData });

    // If ROG date set, update linked invoices' due dates
    if (body.rogDate) {
      // Collect PO IDs: from shipment.poId (legacy) and from linked packing lists
      const poIds = new Set();
      if (shipment.poId) poIds.add(shipment.poId);
      const linkedPLs = await prisma.packingList.findMany({
        where: { shipmentId: id },
        select: { poId: true },
      });
      linkedPLs.forEach(pl => poIds.add(pl.poId));

      for (const poId of poIds) {
        const po = await prisma.purchaseOrder.findFirst({
          where: { id: poId },
          include: { customer: true, invoices: true },
        });
        if (po) {
          const rogDate = new Date(body.rogDate);
          const dueDate = new Date(rogDate);
          dueDate.setDate(dueDate.getDate() + (po.customer?.paymentTermDays || 30));

          for (const inv of po.invoices) {
            await prisma.customerInvoice.update({
              where: { id: inv.id },
              data: { dueDate },
            });
          }
        }
      }
    }

    return NextResponse.json(shipment);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
