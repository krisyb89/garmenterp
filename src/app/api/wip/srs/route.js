// src/app/api/wip/srs/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const columns = await prisma.wIPColumn.findMany({
      where: { scope: 'SRS', isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    const rows = await prisma.sRS.findMany({
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json({ columns, rows });

  } catch (error) {
    console.error('[srs:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
