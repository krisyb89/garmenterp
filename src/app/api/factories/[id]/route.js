// src/app/api/factories/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const factory = await prisma.factory.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true, code: true } },
      productionOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          po: { select: { poNo: true, customer: { select: { name: true } } } },
        },
      },
    },
  });
  if (!factory) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(factory);
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  try {
    const factory = await prisma.factory.update({ where: { id }, data: body });
    return NextResponse.json(factory);
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
