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

  try {
    const styles = await prisma.style.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, code: true } },
        _count: { select: { samples: true, bomItems: true, poLines: true } },
      },
    });

    return NextResponse.json({ styles });
  } catch (error) {
    console.error('Styles GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch styles' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  if (!body.styleNo || !body.customerId) {
    return NextResponse.json({ error: 'Style# and Customer are required' }, { status: 400 });
  }

  try {
    const style = await prisma.style.create({
      data: {
        styleNo: body.styleNo,
        customerId: body.customerId,
        customerRef: body.customerRef,
        description: body.description,
        category: body.category,
        season: body.season,
        year: body.year,
        collection: body.collection,
        techPackUrl: body.techPackUrl,
        imageUrl: body.imageUrl,
        construction: body.construction,
        fitType: body.fitType,
        washInstructions: body.washInstructions,
        notes: body.notes,
      },
    });
    return NextResponse.json(style, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Style# already exists' }, { status: 400 });
    }
    console.error('Style POST error:', error);
    return NextResponse.json({ error: 'Failed to create style' }, { status: 500 });
  }
}
