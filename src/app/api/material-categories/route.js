// src/app/api/material-categories/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.materialCategory.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ categories });
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  try {
    const cat = await prisma.materialCategory.create({ data: { name: name.toUpperCase() } });
    return NextResponse.json(cat, { status: 201 });
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
