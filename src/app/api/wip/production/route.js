// src/app/api/wip/production/route.js
// Production WIP API — returns PO line items with approval & sample statuses joined
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch PO line items with PO, customer, style, production info
  const lineItems = await prisma.pOLineItem.findMany({
    orderBy: [{ po: { orderDate: 'desc' } }, { createdAt: 'asc' }],
    include: {
      po: {
        select: {
          id: true,
          poNo: true,
          status: true,
          orderDate: true,
          shipByDate: true,
          cancelDate: true,
          ihDate: true,
          store: true,
          brand: true,
          shippingTerms: true,
          currency: true,
          customer: { select: { id: true, name: true, code: true } },
          productionOrders: {
            select: {
              id: true,
              status: true,
              factory: { select: { name: true, code: true } },
            },
          },
        },
      },
      // PO-line scoped approvals (preferred)
      approvals: {
        orderBy: [{ type: 'asc' }, { submissionNo: 'desc' }],
        select: {
          id: true,
          type: true,
          slot: true,
          status: true,
          submissionNo: true,
          submitDate: true,
          approvalDate: true,
          reference: true,
          supplierName: true,
          materialId: true,
          material: { select: { name: true, code: true } },
          notes: true,
        },
      },
      style: {
        select: {
          id: true,
          styleNo: true,
          category: true,
          season: true,
          // Approvals for this style
          approvals: {
            orderBy: [{ type: 'asc' }, { submissionNo: 'desc' }],
            select: {
              id: true,
              type: true,
              slot: true,
              status: true,
              submissionNo: true,
              submitDate: true,
              approvalDate: true,
              reference: true,
              supplierName: true,
              materialId: true,
              material: { select: { name: true, code: true } },
              notes: true,
            },
          },
          // Samples for this style
          samples: {
            orderBy: [{ stage: 'asc' }, { revisionNo: 'desc' }],
            select: {
              id: true,
              stage: true,
              status: true,
              revisionNo: true,
              dateSent: true,
              dateReceived: true,
            },
          },
        },
      },
    },
  });

  // Transform into flat rows for the WIP table
  const rows = lineItems.map(li => {
    // PO-line scoped approvals (preferred for Production WIP)
    // All new approvals created from the WIP will have poLineItemId set
    const lineApprovals = li.approvals || [];
    // Style-level approvals (legacy fallback - dormant in new system)
    const styleApprovals = li.style?.approvals || [];
    const samples = li.style?.samples || [];

    // Helper: get latest approval for a key from a list
    function latestApproval(list, predicate) {
      let best = null;
      for (const a of list) {
        if (!predicate(a)) continue;
        if (!best || (a.submissionNo || 0) > (best.submissionNo || 0)) best = a;
      }
      return best;
    }

    // Deterministic mapping by (type, slot). Fallback: style-level by same (type, slot).
    function getCell(type, slot = null) {
      const fromLine = latestApproval(lineApprovals, a => a.type === type && (slot ? a.slot === slot : !a.slot));
      if (fromLine) return fromLine;
      return latestApproval(styleApprovals, a => a.type === type && (slot ? a.slot === slot : !a.slot));
    }

    // Backward-compatible fallback for legacy data where slot is not filled:
    // If there are no slot-scoped fabric/trim approvals on the PO line, we try best-effort mapping
    // from non-slotted approvals by material order. This is ONLY used when slot-based cells are empty.
    function legacyFabricOrTrimFallback(kind) {
      const list = [...lineApprovals, ...styleApprovals].filter(a => a.type === kind && !a.slot);
      const byKey = {};
      for (const a of list) {
        const k = a.materialId || a.supplierName || a.id;
        if (!byKey[k] || (a.submissionNo || 0) > (byKey[k].submissionNo || 0)) byKey[k] = a;
      }
      return Object.values(byKey).sort((a, b) => (b.submissionNo || 0) - (a.submissionNo || 0));
    }
    const legacyFabrics = legacyFabricOrTrimFallback('FABRIC');
    const legacyTrims = legacyFabricOrTrimFallback('TRIM');

    // Sample stages — take latest revision per stage
    const sampleByStage = {};
    for (const s of samples) {
      if (!sampleByStage[s.stage] || s.revisionNo > sampleByStage[s.stage].revisionNo) {
        sampleByStage[s.stage] = s;
      }
    }

    // Factory from production orders
    const prodOrders = li.po?.productionOrders || [];
    const factory = prodOrders[0]?.factory?.name || '';
    const prodStatus = prodOrders[0]?.status || '';

    return {
      id: li.id,
      // PO info
      poId: li.po?.id,
      poNo: li.po?.poNo,
      poStatus: li.po?.status,
      orderDate: li.po?.orderDate,
      shipByDate: li.po?.shipByDate,
      cancelDate: li.po?.cancelDate,
      ihDate: li.po?.ihDate,
      store: li.po?.store,
      brand: li.po?.brand,
      shippingTerms: li.po?.shippingTerms,
      currency: li.po?.currency,
      // Customer
      customerName: li.po?.customer?.name,
      customerCode: li.po?.customer?.code,
      // Style/line
      styleId: li.style?.id,
      styleNo: li.style?.styleNo,
      color: li.color,
      colorCode: li.colorCode,
      category: li.style?.category,
      season: li.style?.season,
      totalQty: li.totalQty,
      unitPrice: li.unitPrice,
      lineTotal: li.lineTotal,
      // Production
      factory,
      prodStatus,
      // Approval milestones (latest per type)
      approvals: {
        LAB_DIP: getCell('LAB_DIP') || null,
        FABRIC_SELF: getCell('FABRIC', 'SELF') || legacyFabrics[0] || null,
        FABRIC_CONTRAST: getCell('FABRIC', 'CONTRAST') || legacyFabrics[1] || null,
        TRIM_1: getCell('TRIM', 'TRIM_1') || legacyTrims[0] || null,
        TRIM_2: getCell('TRIM', 'TRIM_2') || legacyTrims[1] || null,
        PRINT_STRIKEOFF: getCell('PRINT_STRIKEOFF') || null,
        EMBROIDERY_STRIKEOFF: getCell('EMBROIDERY_STRIKEOFF') || null,
        WASH: getCell('WASH') || null,
        FIT: getCell('FIT') || null,
      },
      // Generic indexes for configurable Production WIP columns
      approvalIndex: {
        'LAB_DIP:': getCell('LAB_DIP') || null,
        'FABRIC:SELF': getCell('FABRIC', 'SELF') || legacyFabrics[0] || null,
        'FABRIC:CONTRAST': getCell('FABRIC', 'CONTRAST') || legacyFabrics[1] || null,
        'TRIM:TRIM_1': getCell('TRIM', 'TRIM_1') || legacyTrims[0] || null,
        'TRIM:TRIM_2': getCell('TRIM', 'TRIM_2') || legacyTrims[1] || null,
        'PRINT_STRIKEOFF:': getCell('PRINT_STRIKEOFF') || null,
        'EMBROIDERY_STRIKEOFF:': getCell('EMBROIDERY_STRIKEOFF') || null,
        'WASH:': getCell('WASH') || null,
        'FIT:': getCell('FIT') || null,
      },
      // Sample milestones (latest per stage)
      samples: {
        PROTO: sampleByStage['PROTO'] || null,
        FIT: sampleByStage['FIT'] || null,
        PP: sampleByStage['PP'] || null,
        TOP: sampleByStage['TOP'] || null,
        SHIPMENT: sampleByStage['SHIPMENT'] || null,
        GPT: sampleByStage['GPT'] || null,
      },
      sampleIndex: {
        PROTO: sampleByStage['PROTO'] || null,
        FIT: sampleByStage['FIT'] || null,
        PP: sampleByStage['PP'] || null,
        TOP: sampleByStage['TOP'] || null,
        SHIPMENT: sampleByStage['SHIPMENT'] || null,
        GPT: sampleByStage['GPT'] || null,
      },
    };
  });

  return NextResponse.json({ rows });
}
