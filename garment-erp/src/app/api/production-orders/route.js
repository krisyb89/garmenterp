// src/app/api/production-orders/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const factoryId = searchParams.get('factoryId');

  const where = {};
  if (status) where.status = status;
  if (factoryId) where.factoryId = factoryId;

  const orders = await prisma.productionOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      po: { select: { poNo: true, customer: { select: { name: true, code: true } } } },
      factory: { select: { name: true, country: true, isInHouse: true } },
      _count: { select: { inspections: true } },
    },
  });
  return NextResponse.json({ productionOrders: orders });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const count = await prisma.productionOrder.count();
  const prodOrderNo = `PROD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  const order = await prisma.productionOrder.create({
    data: {
      prodOrderNo,
      poId: body.poId,
      factoryId: body.factoryId,
      styleNo: body.styleNo,
      color: body.color,
      sizeBreakdown: body.sizeBreakdown,
      totalQty: body.totalQty,
      targetStartDate: body.targetStartDate ? new Date(body.targetStartDate) : null,
      targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : null,
      cmtRate: body.cmtRate,
      cmtCurrency: body.cmtCurrency || 'USD',
      specialInstructions: body.specialInstructions,
      notes: body.notes,
    },
    include: { factory: true, po: { select: { poNo: true } } },
  });
  return NextResponse.json(order, { status: 201 });
}
