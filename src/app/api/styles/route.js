// src/app/api/styles/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.styleNo || !body.customerId) {
    return NextResponse.json({ error: 'Style# and Customer are required' }, { status: 400 });
  }

  try {
    const style = await prisma.style.create({
      data: {
        styleNo: body.styleNo,
        customerId: body.customerId,
        customerRef: body.customerRef || null,
        category: body.category || null,
        season: body.season || null,
        construction: body.construction || null,
        fitType: body.fitType || null,
        description: body.description || null,
        washInstructions: body.washInstructions || null,
        notes: body.notes || null,
        imageUrl: body.imageUrl || null,
        techPackUrl: body.techPackUrl || null,
        imageUrls: body.imageUrls && body.imageUrls.length > 0 ? body.imageUrls : undefined,
        attachments: body.attachments && body.attachments.length > 0 ? body.attachments : undefined,
      },
    });
    return NextResponse.json(style, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Style# already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create style' }, { status: 500 });
  }
}
