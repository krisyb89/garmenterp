// src/app/api/purchase-orders/line-items/route.js
// Bulk endpoint: returns all PO line items grouped by poId (single query)
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const lineItems = await prisma.pOLineItem.findMany({
      select: {
        id:    true,
        poId:  true,
        color: true,
        style: { select: { styleNo: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by poId
    const byPO = {};
    lineItems.forEach(li => {
      if (!byPO[li.poId]) byPO[li.poId] = [];
      byPO[li.poId].push({ id: li.id, color: li.color, style: li.style });
    });

    return NextResponse.json({ lineItemsByPO: byPO });
  } catch (err) {
    console.error('[GET /api/purchase-orders/line-items] error:', err);
    return NextResponse.json({ error: 'Failed to fetch line items' }, { status: 500 });
  }
}
