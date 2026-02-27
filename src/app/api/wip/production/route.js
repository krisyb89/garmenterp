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
    const approvals = li.style?.approvals || [];
    const samples = li.style?.samples || [];

    // Group approvals by type, take the latest submission for each
    const approvalByType = {};
    for (const a of approvals) {
      const key = a.type;
      // Keep the latest submission number for each type
      if (!approvalByType[key] || a.submissionNo > approvalByType[key].submissionNo) {
        approvalByType[key] = a;
      }
    }

    // For FABRIC type, separate by material if possible (self vs contrast)
    // Get all fabric approvals sorted by submission
    const fabricApprovals = approvals.filter(a => a.type === 'FABRIC');
    const trimApprovals = approvals.filter(a => a.type === 'TRIM');

    // Group fabric by material (first = self, second = contrast)
    const fabricByMaterial = {};
    for (const a of fabricApprovals) {
      const matKey = a.materialId || a.supplierName || 'default';
      if (!fabricByMaterial[matKey] || a.submissionNo > fabricByMaterial[matKey].submissionNo) {
        fabricByMaterial[matKey] = a;
      }
    }
    const fabricKeys = Object.keys(fabricByMaterial);

    // Group trim by material
    const trimByMaterial = {};
    for (const a of trimApprovals) {
      const matKey = a.materialId || a.supplierName || `trim_${a.id}`;
      if (!trimByMaterial[matKey] || a.submissionNo > trimByMaterial[matKey].submissionNo) {
        trimByMaterial[matKey] = a;
      }
    }
    const trimKeys = Object.keys(trimByMaterial);

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
        LAB_DIP: approvalByType['LAB_DIP'] || null,
        FABRIC_SELF: fabricByMaterial[fabricKeys[0]] || null,
        FABRIC_CONTRAST: fabricByMaterial[fabricKeys[1]] || null,
        TRIM_1: trimByMaterial[trimKeys[0]] || null,
        TRIM_2: trimByMaterial[trimKeys[1]] || null,
        PRINT_STRIKEOFF: approvalByType['PRINT_STRIKEOFF'] || null,
        EMBROIDERY_STRIKEOFF: approvalByType['EMBROIDERY_STRIKEOFF'] || null,
        WASH: approvalByType['WASH'] || null,
        FIT: approvalByType['FIT'] || null,
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
    };
  });

  return NextResponse.json({ rows });
}
