// src/app/api/production-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      po: { include: { customer: true } },
      factory: true,
      stageTracking: { orderBy: { createdAt: 'asc' } },
      inspections: { orderBy: { inspectionDate: 'desc' } },
      materialIssues: { orderBy: { issuedDate: 'desc' } },
    },
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const order = await prisma.productionOrder.update({
      where: { id },
      data: {
        status: body.status,
        color: body.color,
        sizeBreakdown: body.sizeBreakdown,
        totalQty: body.totalQty,
        targetStartDate: body.targetStartDate ? new Date(body.targetStartDate) : undefined,
        targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : undefined,
        actualStartDate: body.actualStartDate ? new Date(body.actualStartDate) : undefined,
        actualEndDate: body.actualEndDate ? new Date(body.actualEndDate) : undefined,
        cmtRate: body.cmtRate,
        cmtCurrency: body.cmtCurrency,
        specialInstructions: body.specialInstructions,
        notes: body.notes,
      },
    });
    return NextResponse.json(order);
  } catch (error) {
    console.error('Production order PUT error:', error);
    return NextResponse.json({ error: 'Failed to update production order' }, { status: 500 });
  }
}
