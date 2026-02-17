// src/app/api/samples/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const styleId = searchParams.get('styleId');
  const stage = searchParams.get('stage');
  const status = searchParams.get('status');

  const where = {};
  if (styleId) where.styleId = styleId;
  if (stage) where.stage = stage;
  if (status) where.status = status;

  const samples = await prisma.sample.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      style: { select: { styleNo: true, customer: { select: { name: true, code: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  return NextResponse.json({ samples });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();

  // Auto-calculate revision number
  const existingSamples = await prisma.sample.count({
    where: { styleId: body.styleId, stage: body.stage },
  });

  const sample = await prisma.sample.create({
    data: {
      styleId: body.styleId,
      stage: body.stage,
      revisionNo: existingSamples + 1,
      size: body.size,
      fabricUsed: body.fabricUsed,
      trimUsed: body.trimUsed,
      dateSent: body.dateSent ? new Date(body.dateSent) : null,
      courierName: body.courierName,
      trackingNo: body.trackingNo,
      internalNotes: body.internalNotes,
      imageUrls: body.imageUrls || null,
      createdById: user.userId,
      status: body.status || 'PENDING',
    },
    include: { style: { select: { styleNo: true } } },
  });
  return NextResponse.json(sample, { status: 201 });
}
