// src/app/api/suppliers/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { supplierPOs: { orderBy: { createdAt: 'desc' }, take: 20 }, materials: { include: { material: true } } },
  });
  if (!supplier) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  const body = await request.json();
  const supplier = await prisma.supplier.update({ where: { id }, data: body });
  return NextResponse.json(supplier);
}
