// src/app/api/styles/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const style = await prisma.style.findUnique({
      where: { id },
      include: {
        customer: true,
        bomItems: { orderBy: { createdAt: 'asc' }, include: { material: { include: { category: true } } } },
        approvals: { orderBy: { createdAt: 'desc' } },
        poLines: { include: { po: { select: { poNo: true, status: true } } } },
        srsRequests: { include: { costingSheets: { orderBy: { revisionNo: 'desc' }, take: 1 } } },
      },
    });

    if (!style) return NextResponse.json({ error: 'Style not found' }, { status: 404 });
    return NextResponse.json(style);

  } catch (error) {
    console.error('[[id]:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const style = await prisma.style.update({ where: { id }, data: body });
    return NextResponse.json(style);

  } catch (error) {
    console.error('[[id]:PUT]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
