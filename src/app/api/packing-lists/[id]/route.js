// src/app/api/packing-lists/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const pl = await prisma.packingList.findUnique({
      where: { id },
      include: {
        po: {
          include: {
            customer: true,
            lineItems: {
              include: {
                style: { select: { styleNo: true, description: true, usHsCode: true } },
              },
            },
          },
        },
        shipment: { select: { shipmentNo: true, status: true } },
        cartons: {
          orderBy: { cartonNo: 'asc' },
          include: {
            poLineItem: {
              select: { id: true, color: true, totalQty: true, unitPrice: true, shippingOrders: true, style: { select: { styleNo: true } } },
            },
          },
        },
      },
    });

    if (!pl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Recompute totals from cartons for accuracy
    let totalCartons = 0, totalQty = 0, totalGrossWeight = 0, totalNetWeight = 0, totalCBM = 0;
    for (const c of (pl.cartons || [])) {
      totalCartons += 1;
      totalQty += c.totalPcs || 0;
      totalGrossWeight += Number(c.grossWeight) || 0;
      totalNetWeight += Number(c.netWeight) || 0;
      totalCBM += Number(c.cbm) || 0;
    }
    pl.totalCartons = totalCartons;
    pl.totalQty = totalQty;
    pl.totalGrossWeight = totalGrossWeight;
    pl.totalNetWeight = totalNetWeight;
    pl.totalCBM = totalCBM;

    return NextResponse.json(pl);

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

    const allowedFields = ['status', 'notes', 'shipmentId', 'exFtyDate'];
    const updateData = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === 'exFtyDate') {
          updateData[key] = body[key] ? new Date(body[key]) : null;
        } else if (key === 'shipmentId') {
          updateData[key] = body[key] || null;
        } else {
          updateData[key] = body[key];
        }
      }
    }

    const pl = await prisma.packingList.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(pl);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await prisma.packingList.delete({ where: { id } });
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[[id]:DELETE]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
