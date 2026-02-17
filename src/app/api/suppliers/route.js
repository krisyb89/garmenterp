// src/app/api/suppliers/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const search = searchParams.get('search') || '';

  const where = { isActive: true };
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where, orderBy: { name: 'asc' },
    include: { _count: { select: { supplierPOs: true } } },
  });
  return NextResponse.json({ suppliers });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.name || !body.code || !body.type) {
    return NextResponse.json({ error: 'Name, code, and type are required' }, { status: 400 });
  }

  try {
    const supplier = await prisma.supplier.create({
      data: { ...body, code: body.code.toUpperCase() },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}
