// src/app/api/packing/pos/route.js
// Returns POs with outstanding (unshipped) quantities for the packing wizard
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch active POs that are IN_PRODUCTION or CONFIRMED
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        poNo: true,
        customer: { select: { name: true, code: true } },
        lineItems: {
          select: {
            id: true,
            color: true,
            colorCode: true,
            totalQty: true,
            unitPrice: true,
            sizeBreakdown: true,
            shippingOrders: true,
            style: { select: { styleNo: true, description: true, usHsCode: true } },
          },
        },
      },
    });

    // For each PO, calculate packed qty per line item from existing cartons
    for (const po of pos) {
      const cartons = await prisma.carton.findMany({
        where: {
          packingList: { poId: po.id },
          poLineItemId: { not: null },
        },
        select: {
          poLineItemId: true,
          dcName: true,
          totalPcs: true,
          sizeBreakdown: true,
        },
      });

      // Build packed qty map: poLineItemId -> total packed
      const packedMap = {};
      const packedByDC = {}; // poLineItemId|dcName -> { totalPcs, sizeBreakdown }
      for (const c of cartons) {
        packedMap[c.poLineItemId] = (packedMap[c.poLineItemId] || 0) + c.totalPcs;
        const dcKey = `${c.poLineItemId}|${c.dcName || ''}`;
        if (!packedByDC[dcKey]) packedByDC[dcKey] = { totalPcs: 0, sizes: {} };
        packedByDC[dcKey].totalPcs += c.totalPcs;
        if (c.sizeBreakdown && typeof c.sizeBreakdown === 'object') {
          for (const [sz, qty] of Object.entries(c.sizeBreakdown)) {
            packedByDC[dcKey].sizes[sz] = (packedByDC[dcKey].sizes[sz] || 0) + (parseInt(qty) || 0);
          }
        }
      }

      // Attach outstanding info to each line item
      for (const li of po.lineItems) {
        li.packedQty = packedMap[li.id] || 0;
        li.outstandingQty = li.totalQty - li.packedQty;
        li.packedByDC = {};
        // Extract DCs from shippingOrders
        const sos = li.shippingOrders || [];
        for (const so of sos) {
          const dcKey = `${li.id}|${so.dc || ''}`;
          li.packedByDC[so.dc] = packedByDC[dcKey] || { totalPcs: 0, sizes: {} };
        }
      }
    }

    return NextResponse.json({ pos });
  } catch (error) {
    console.error('[packing/pos:GET]', error?.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
