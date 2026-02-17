// src/app/api/styles/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const customerId = searchParams.get('customerId');

  const where = { isActive: true };
  if (customerId) where.customerId = customerId;
  if (search) {
    where.OR = [
      { styleNo: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { customerRef: { contains: search, mode: 'insensitive' } },
    ];
  }

  const styles = await prisma.style.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, code: true } },
      _count: { select: { samples: true, bomItems: true, poLines: true } },
    },
  });

  return NextResponse.json({ styles });
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.styleNo || !body.customerId) {
    return NextResponse.json({ error: 'Style# and Customer are required' }, { status: 400 });
  }

  try {
    const style = await prisma.style.create({ data: body });
    return NextResponse.json(style, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Style# already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create style' }, { status: 500 });
  }
}
