// src/app/api/production-orders/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const order = await prisma.productionOrder.update({ where: { id }, data: body });
  return NextResponse.json(order);
}
