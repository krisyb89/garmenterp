// src/app/api/wip-cells/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const data = {};
  if (body.label     !== undefined) data.label     = body.label;
  if (body.status    !== undefined) data.status    = body.status;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const cell = await prisma.wIPCell.update({
    where: { id },
    data,
    include: {
      poLineItem: {
        include: {
          po:    { select: { id: true, poNo: true } },
          style: { select: { id: true, styleNo: true } },
        },
      },
      comments: { orderBy: { createdAt: 'asc' } },
    },
  });
  return NextResponse.json(cell);
}

export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await prisma.wIPCell.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
