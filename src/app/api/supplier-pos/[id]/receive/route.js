// src/app/api/supplier-pos/[id]/receive/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toPlain } from '@/lib/serialize';

// Map supplier type → OrderCost category
const SUPPLIER_TYPE_TO_COST_CATEGORY = {
  FABRIC_MILL:      'FABRIC',
  TRIM_SUPPLIER:    'TRIM',
  CMT_FACTORY:      'CMT',
  WASHING_PLANT:    'WASHING',
  PRINT_EMBROIDERY: 'EMBELLISHMENT',
  PACKAGING:        'PACKAGING',
  OTHER:            'OTHER',
};

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const { receivedDate, receivedBy, location, notes, items } = body;

    if (!items?.length) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Fetch SPO with supplier info and line items (including poLineItemId)
    const spo = await prisma.supplierPO.findUnique({
      where: { id },
      include: {
        supplier: { select: { name: true, type: true } },
        lineItems: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, description: true, color: true, poLineItemId: true, vatRate: true, vatRefundable: true },
        },
      },
    });
    if (!spo) return NextResponse.json({ error: 'Supplier PO not found' }, { status: 404 });

    // Process items
    const processedItems = items.map(item => {
      const receivedQty = parseFloat(item.receivedQty || 0);
      const actualUnitPrice = item.actualUnitPrice != null && item.actualUnitPrice !== ''
        ? parseFloat(item.actualUnitPrice) : null;
      const actualLineTotal = actualUnitPrice != null ? receivedQty * actualUnitPrice : null;

      return {
        description:     item.description || '',
        color:           item.color || null,
        orderedQty:      parseFloat(item.orderedQty || 0),
        receivedQty,
        unit:            item.unit || 'YDS',
        actualUnitPrice,
        actualLineTotal,
        qcResult:        item.qcResult || null,
        remarks:         item.remarks || null,
        // Track which SPO line this corresponds to (by index from frontend)
        _spoLineIndex:   item.spoLineIndex ?? null,
      };
    });

    // Pre-compute cost allocation data outside the transaction
    const category = SUPPLIER_TYPE_TO_COST_CATEGORY[spo.supplier?.type] || 'OTHER';
    const today = new Date().toISOString().split('T')[0];

    // Fetch customer PO exchange rate for base currency conversion (CNY is base)
    // exchangeRate on PO = CNY per foreign currency unit (e.g. 7.2 = 1 USD → 7.2 CNY)
    let poExchangeRate = 1;
    if (spo.customerPOId && spo.currency && spo.currency !== 'CNY') {
      const customerPO = await prisma.purchaseOrder.findUnique({
        where: { id: spo.customerPOId },
        select: { exchangeRate: true },
      });
      poExchangeRate = parseFloat(customerPO?.exchangeRate || 1);
    }

    // Group received items by their linked PO line item
    // Deduct VAT refund from cost when the SPO line is marked vatRefundable
    const costsByPoLineItem = {};  // poLineItemId → { gross, net, vatRefund }
    let unallocatedGross = 0;
    let unallocatedNet = 0;
    let unallocatedVatRefund = 0;

    processedItems.forEach((item, idx) => {
      if (!item.actualLineTotal || item.actualLineTotal <= 0) return;

      // Try to find the corresponding SPO line to get poLineItemId + VAT info
      const spoLine = spo.lineItems[item._spoLineIndex ?? idx];
      const poLineItemId = spoLine?.poLineItemId || null;

      // Calculate VAT refund deduction
      const gross = item.actualLineTotal;
      const vatRate = parseFloat(spoLine?.vatRate || 0);
      const vatRefundable = spoLine?.vatRefundable || false;
      const vatRefund = vatRefundable && vatRate > 0 ? gross * vatRate / 100 : 0;
      const netCost = gross - vatRefund;

      if (poLineItemId) {
        if (!costsByPoLineItem[poLineItemId]) {
          costsByPoLineItem[poLineItemId] = { gross: 0, net: 0, vatRefund: 0 };
        }
        costsByPoLineItem[poLineItemId].gross += gross;
        costsByPoLineItem[poLineItemId].net += netCost;
        costsByPoLineItem[poLineItemId].vatRefund += vatRefund;
      } else {
        unallocatedGross += gross;
        unallocatedNet += netCost;
        unallocatedVatRefund += vatRefund;
      }
    });

    // Pre-fetch PO line item → poId mapping (outside transaction for speed)
    const poLineItemIds = Object.keys(costsByPoLineItem);
    let poLineItemMap = {};
    if (poLineItemIds.length > 0) {
      const poLineItems = await prisma.pOLineItem.findMany({
        where: { id: { in: poLineItemIds } },
        select: { id: true, poId: true },
      });
      poLineItemMap = Object.fromEntries(poLineItems.map(pl => [pl.id, pl.poId]));
    }

    // Build all OrderCost data records upfront (using net cost after VAT refund)
    const orderCostRecords = [];

    const spoCurrency = spo.currency || 'CNY';
    // For CNY SPOs: base = cost × 1; for foreign-currency SPOs: base = cost × poExchangeRate
    const toBase = (amount) => amount * poExchangeRate;

    for (const [poLineItemId, amounts] of Object.entries(costsByPoLineItem)) {
      const poId = poLineItemMap[poLineItemId];
      if (!poId || amounts.net <= 0) continue;
      const vatNote = amounts.vatRefund > 0
        ? ` | VAT refund: ${amounts.vatRefund.toFixed(2)} (gross: ${amounts.gross.toFixed(2)})`
        : '';
      orderCostRecords.push({
        poId,
        poLineItemId,
        category,
        description:   `${spo.spoNo} — ${spo.supplier?.name || 'Supplier'} (actual receipt)`,
        supplierName:  spo.supplier?.name || null,
        totalCost:     amounts.net,
        currency:      spoCurrency,
        exchangeRate:  poExchangeRate,
        totalCostBase: toBase(amounts.net),
        supplierPORef: spo.spoNo,
        notes:         `Auto-synced from goods received on ${today}${vatNote}`,
      });
    }

    if (unallocatedNet > 0 && spo.customerPOId) {
      const vatNote = unallocatedVatRefund > 0
        ? ` | VAT refund: ${unallocatedVatRefund.toFixed(2)} (gross: ${unallocatedGross.toFixed(2)})`
        : '';
      orderCostRecords.push({
        poId:          spo.customerPOId,
        poLineItemId:  null,
        category,
        description:   `${spo.spoNo} — ${spo.supplier?.name || 'Supplier'} (actual receipt, unallocated)`,
        supplierName:  spo.supplier?.name || null,
        totalCost:     unallocatedNet,
        currency:      spoCurrency,
        exchangeRate:  poExchangeRate,
        totalCostBase: toBase(unallocatedNet),
        supplierPORef: spo.spoNo,
        notes:         `Auto-synced from goods received on ${today} — unallocated${vatNote}`,
      });
    }

    // Use batch transaction (array of operations) — more reliable on Neon serverless
    // than interactive transactions which hold open connections
    const grCreate = prisma.goodsReceived.create({
      data: {
        supplierPOId: id,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        receivedBy:   receivedBy || user.name || null,
        location:     location || null,
        notes:        notes || null,
        items: {
          create: processedItems.map(({ _spoLineIndex, ...item }) => item),
        },
      },
      include: { items: true },
    });

    // Figure out new SPO status
    const existingGRs = await prisma.goodsReceived.findMany({
      where: { supplierPOId: id },
      include: { items: true },
    });
    const prevReceived = existingGRs.reduce((sum, g) =>
      g.items.reduce((s, i) => s + parseFloat(i.receivedQty), sum), 0);
    const newReceived = processedItems.reduce((s, i) => s + (i.receivedQty || 0), 0);
    const totalReceived = prevReceived + newReceived;

    // Use SPO line items for total ordered qty
    const spoDetail = await prisma.supplierPO.findUnique({
      where: { id },
      include: { lineItems: { select: { quantity: true } } },
    });
    const totalOrdered = spoDetail?.lineItems?.reduce(
      (s, li) => s + parseFloat(li.quantity || 0), 0
    ) || 0;

    const newStatus = totalOrdered > 0 && totalReceived >= totalOrdered
      ? 'FULLY_RECEIVED'
      : 'PARTIALLY_RECEIVED';

    const statusUpdate = prisma.supplierPO.update({
      where: { id },
      data: { status: newStatus },
    });

    // Build batch operations array
    const operations = [grCreate, statusUpdate];

    // Add OrderCost creates
    for (const costData of orderCostRecords) {
      operations.push(prisma.orderCost.create({ data: costData }));
    }

    // Execute all as a batch transaction (Prisma sends one round-trip)
    const results = await prisma.$transaction(operations);
    const result = results[0]; // The GR create result

    return NextResponse.json(toPlain(result), { status: 201 });
  } catch (err) {
    console.error('[POST /api/supplier-pos/[id]/receive] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to record goods received' },
      { status: 500 }
    );
  }
}
