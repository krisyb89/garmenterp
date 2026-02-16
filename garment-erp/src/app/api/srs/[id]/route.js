// src/app/api/srs/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const srs = await prisma.sRS.findUnique({
      where: { id },
      include: {
        customer: true,
        style: { include: { bomItems: { include: { material: true } }, samples: true } },
        createdBy: { select: { name: true, email: true } },
        costingSheet: true,
      },
    });

    if (!srs) return NextResponse.json({ error: 'SRS not found' }, { status: 404 });
    return NextResponse.json(srs);
  } catch (error) {
    console.error('SRS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch SRS' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    // If status is changing, track it
    const current = await prisma.sRS.findUnique({ where: { id } });
    if (body.status && body.status !== current.status) {
      await prisma.activityLog.create({
        data: {
          userId: user.userId,
          action: 'STATUS_CHANGE',
          entity: 'SRS',
          entityId: id,
          details: { from: current.status, to: body.status },
        },
      });
    }

    const srs = await prisma.sRS.update({
      where: { id },
      data: {
        description: body.description,
        techPackUrl: body.techPackUrl,
        targetPrice: body.targetPrice,
        targetPriceCurrency: body.targetPriceCurrency,
        estimatedQtyMin: body.estimatedQtyMin,
        estimatedQtyMax: body.estimatedQtyMax,
        deliveryWindow: body.deliveryWindow,
        targetMarkets: body.targetMarkets,
        fabricSpecs: body.fabricSpecs,
        trimSpecs: body.trimSpecs,
        status: body.status,
        revisionNo: body.revisionNo,
        quotedPrice: body.quotedPrice,
        quotedDate: body.quotedDate ? new Date(body.quotedDate) : undefined,
        confirmedDate: body.confirmedDate ? new Date(body.confirmedDate) : undefined,
        notes: body.notes,
        styleId: body.styleId,
      },
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json(srs);
  } catch (error) {
    console.error('SRS PUT error:', error);
    return NextResponse.json({ error: 'Failed to update SRS' }, { status: 500 });
  }
}
