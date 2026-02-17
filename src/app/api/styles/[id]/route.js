// src/app/api/styles/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
}

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const style = await prisma.style.update({ where: { id }, data: body });
  return NextResponse.json(style);
}
