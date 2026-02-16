// src/app/api/shipments/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      po: { include: { customer: true } },
      packingLists: { include: { cartons: true } },
      documents: true,
    },
  });
  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(shipment);
}

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
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
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: shipment.poId },
      include: { customer: true, invoices: true },
    });
    if (po) {
      const rogDate = new Date(body.rogDate);
      const dueDate = new Date(rogDate);
      dueDate.setDate(dueDate.getDate() + po.customer.paymentTermDays);

      for (const inv of po.invoices) {
        await prisma.customerInvoice.update({
          where: { id: inv.id },
          data: { dueDate },
        });
      }
    }
  }

  return NextResponse.json(shipment);
}
