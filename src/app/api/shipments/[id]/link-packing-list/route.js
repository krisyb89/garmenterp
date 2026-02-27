// src/app/api/shipments/[id]/link-packing-list/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// POST — Link a packing list to this shipment
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.packingListId) {
      return NextResponse.json({ error: 'packingListId is required' }, { status: 400 });
    }

    // Verify shipment exists
    const shipment = await prisma.shipment.findUnique({ where: { id } });
    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

    // Verify packing list exists
    const pl = await prisma.packingList.findUnique({ where: { id: body.packingListId } });
    if (!pl) return NextResponse.json({ error: 'Packing list not found' }, { status: 404 });

    // Link packing list to shipment
    const updated = await prisma.packingList.update({
      where: { id: body.packingListId },
      data: { shipmentId: id },
      include: {
        po: { select: { poNo: true, customer: { select: { name: true } } } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[link-packing-list:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Unlink a packing list from this shipment
export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (!body.packingListId) {
      return NextResponse.json({ error: 'packingListId is required' }, { status: 400 });
    }

    const updated = await prisma.packingList.update({
      where: { id: body.packingListId },
      data: { shipmentId: null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[link-packing-list:DELETE]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
