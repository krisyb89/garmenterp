// src/app/api/supplier-pos/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const spo = await prisma.supplierPO.findUnique({
    where: { id },
    include: { supplier: true, customerPO: { include: { customer: true } }, lineItems: true, goodsReceived: { include: { items: true } } },
  });
  if (!spo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(spo);
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const spo = await prisma.supplierPO.update({ where: { id }, data: { status: body.status, notes: body.notes } });
  return NextResponse.json(spo);
}
