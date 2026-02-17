// src/app/api/styles/[id]/bom/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const bom = await prisma.bOMItem.findMany({
    where: { styleId: id },
    orderBy: [{ createdAt: 'asc' }],
    include: {
      material: { include: { category: true } },
    },
  });

  return NextResponse.json({ bomItems: bom });
}
