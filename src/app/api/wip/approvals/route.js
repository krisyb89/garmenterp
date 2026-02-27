// src/app/api/wip/approvals/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET /api/wip/approvals
 * Query params:
 *   customerId  – filter by customer
 *   poId        – filter by a single PO
 *
 * Returns PO line items with their WIP cells and comment history.
 */
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const poId       = searchParams.get('poId');

    // Build the POLineItem where clause
    const where = {};
    if (poId) {
      where.poId = poId;
    } else if (customerId) {
      where.po = { customerId };
    } else {
      // No filter — limit to recent 200 lines to avoid huge payloads
      where.po = {};
    }

    const lineItems = await prisma.pOLineItem.findMany({
      where,
      orderBy: [{ po: { ihDate: 'asc' } }, { createdAt: 'asc' }],
      take: 300,
      include: {
        po:    { select: { id: true, poNo: true, ihDate: true, shipByDate: true, store: true, customer: { select: { id: true, name: true } } } },
        style: { select: { id: true, styleNo: true } },
        wipCells: {
          orderBy: [{ segment: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            comments: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    return NextResponse.json({ lineItems });

  } catch (error) {
    console.error('[approvals:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
