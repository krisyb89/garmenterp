// src/app/api/shipments/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = {};
    if (status) where.status = status;

    const shipments = await prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        po: { select: { poNo: true, customer: { select: { name: true, code: true } } } },
        packingLists: {
          select: {
            id: true, packingListNo: true, totalCartons: true, totalQty: true, exFtyDate: true,
            po: { select: { poNo: true, customer: { select: { name: true } } } },
          },
        },
      },
    });
    return NextResponse.json({ shipments });

  } catch (error) {
    console.error('[shipments:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const count = await prisma.shipment.count();
    const shipmentNo = `SHP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const shipment = await prisma.shipment.create({
      data: {
        shipmentNo,
        poId: body.poId || null,
        shipmentMethod: body.shipmentMethod || 'SEA_FCL',
        shippingTerms: body.shippingTerms || 'FOB',
        portOfLoading: body.portOfLoading,
        portOfDischarge: body.portOfDischarge,
        etd: body.etd ? new Date(body.etd) : null,
        eta: body.eta ? new Date(body.eta) : null,
        vesselName: body.vesselName,
        containerNo: body.containerNo,
        forwarderName: body.forwarderName,
        freightCost: body.freightCost,
        notes: body.notes,
      },
      include: { po: { select: { poNo: true } }, packingLists: { select: { id: true, packingListNo: true } } },
    });
    return NextResponse.json(shipment, { status: 201 });

  } catch (error) {
    console.error('[shipments:POST]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
