// src/app/api/factories/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const factories = await prisma.factory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: { _count: { select: { productionOrders: true } } },
  });
  return NextResponse.json({ factories });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.name || !body.code || !body.country) {
    return NextResponse.json({ error: 'Name, code, and country are required' }, { status: 400 });
  }
  try {
    const factory = await prisma.factory.create({ data: body });
    return NextResponse.json(factory, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') return NextResponse.json({ error: 'Code exists' }, { status: 400 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
