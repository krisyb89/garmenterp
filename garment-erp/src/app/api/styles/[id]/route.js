// src/app/api/styles/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const style = await prisma.style.findUnique({
      where: { id },
      include: {
        customer: true,
        bomItems: { include: { material: true } },
        samples: { orderBy: { createdAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        poLines: { include: { po: { select: { poNo: true, status: true } } } },
        srs: { include: { costingSheet: true } },
      },
    });

    if (!style) return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    return NextResponse.json(style);
  } catch (error) {
    console.error('Style GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch style' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const style = await prisma.style.update({
      where: { id },
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
    return NextResponse.json(style);
  } catch (error) {
    console.error('Style PUT error:', error);
    return NextResponse.json({ error: 'Failed to update style' }, { status: 500 });
  }
}
