// src/app/api/wip/srs/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const wipData = body.wipData || {};

  const updated = await prisma.sRS.update({
    where: { id },
    data: { wipData },
    select: { id: true, wipData: true },
  });
  return NextResponse.json(updated);
}
