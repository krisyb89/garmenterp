// src/app/api/srs/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
      data: body,
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json(srs);
  } catch (error) {
    console.error('SRS PUT error:', error);
    return NextResponse.json({ error: 'Failed to update SRS' }, { status: 500 });
  }
}
