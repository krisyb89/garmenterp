// src/app/api/samples/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const sample = await prisma.sample.findUnique({
    where: { id },
    include: {
      style: { include: { customer: { select: { name: true, code: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!sample) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(sample);
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.dateSent !== undefined) data.dateSent = body.dateSent ? new Date(body.dateSent) : null;
  if (body.dateReceived !== undefined) data.dateReceived = body.dateReceived ? new Date(body.dateReceived) : null;
  if (body.courierName !== undefined) data.courierName = body.courierName;
  if (body.trackingNo !== undefined) data.trackingNo = body.trackingNo;
  if (body.customerComments !== undefined) data.customerComments = body.customerComments;
  if (body.internalNotes !== undefined) data.internalNotes = body.internalNotes;
  if (body.imageUrls !== undefined) data.imageUrls = body.imageUrls;
  if (body.size !== undefined) data.size = body.size;
  if (body.fabricUsed !== undefined) data.fabricUsed = body.fabricUsed;
  if (body.trimUsed !== undefined) data.trimUsed = body.trimUsed;

  const sample = await prisma.sample.update({
    where: { id },
    data,
    include: { style: { select: { styleNo: true } } },
  });
  return NextResponse.json(sample);
}
