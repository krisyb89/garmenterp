// src/app/api/wip/pos/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const columns = await prisma.wIPColumn.findMany({
    where: { scope: 'PO', isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });

  const rows = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { customer: { select: { name: true } }, lineItems: { select: { id: true, style: { select: { styleNo: true } }, color: true, unitPrice: true, totalQty: true } } },
  });

  return NextResponse.json({ columns, rows });
}
