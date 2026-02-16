// src/app/api/materials/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const search = searchParams.get('search') || '';

  const where = { isActive: true };
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { composition: { contains: search, mode: 'insensitive' } },
    ];
  }

  const materials = await prisma.material.findMany({
    where, orderBy: { code: 'asc' },
    include: { suppliers: { include: { supplier: { select: { name: true, code: true } } } } },
  });
  return NextResponse.json({ materials });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.code || !body.name || !body.type) {
    return NextResponse.json({ error: 'Code, name, and type are required' }, { status: 400 });
  }

  try {
    const material = await prisma.material.create({ data: body });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Code already exists' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
