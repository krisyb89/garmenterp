// src/app/api/invoices/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const invoices = await prisma.customerInvoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, code: true } },
        po: { select: { poNo: true } },
        shipment: { select: { shipmentNo: true } },
        _count: { select: { payments: true } },
      },
    });
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error('[GET /api/invoices] error:', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const count = await prisma.customerInvoice.count();
  const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

  // ============================================================
  // MODE 1: Generate from Shipment (Phase 2 — multi-PO)
  // ============================================================
  if (body.shipmentId) {
    const shipment = await prisma.shipment.findUnique({
      where: { id: body.shipmentId },
      include: {
        po: { include: { customer: true } },
        packingLists: {
          include: {
            cartons: {
              include: {
                poLineItem: {
                  include: {
                    style: { select: { styleNo: true, description: true, usHsCode: true } },
                    po: { select: { id: true, poNo: true, currency: true } },
                  },
                },
              },
            },
            po: { select: { id: true, poNo: true, currency: true } },
          },
        },
      },
    });

    if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

    const customer = shipment.po.customer;

    // Aggregate carton data: group by POLineItem + dcName
    // key = poLineItemId|dcName
    const lineMap = new Map();

    for (const pl of shipment.packingLists) {
      for (const carton of pl.cartons) {
        const pli = carton.poLineItem;
        // If carton doesn't have a poLineItem link, fall back to styleNo+color from carton
        const key = pli
          ? `${pli.id}|${carton.dcName || ''}`
          : `${carton.styleNo}|${carton.color}|${carton.dcName || ''}`;

        if (!lineMap.has(key)) {
          lineMap.set(key, {
            poId: pli?.po?.id || pl.poId,
            poLineItemId: pli?.id || null,
            styleNo: pli?.style?.styleNo || carton.styleNo,
            color: pli?.color || carton.color,
            dcName: carton.dcName || null,
            description: pli?.style?.description || '',
            htsCode: pli?.style?.usHsCode || null,
            unitPrice: pli ? parseFloat(pli.unitPrice) : 0,
            quantity: 0,
          });
        }
        lineMap.get(key).quantity += carton.totalPcs;
      }
    }

    const lineItems = Array.from(lineMap.values()).map(l => ({
      poId: l.poId,
      poLineItemId: l.poLineItemId,
      styleNo: l.styleNo,
      color: l.color,
      dcName: l.dcName,
      description: l.description,
      htsCode: l.htsCode,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.quantity * l.unitPrice,
    }));

    const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
    const adjustments = parseFloat(body.adjustments || 0);
    const totalAmount = subtotal + adjustments;

    // Sum weights/cartons from packing lists
    let grossWeight = 0, netWeight = 0, totalCartons = 0;
    for (const pl of shipment.packingLists) {
      grossWeight += parseFloat(pl.totalGrossWeight || 0);
      netWeight += parseFloat(pl.totalNetWeight || 0);
      totalCartons += pl.totalCartons || 0;
    }

    // Calculate due date from ROG
    let dueDate = null;
    if (shipment.rogDate) {
      dueDate = new Date(shipment.rogDate);
      dueDate.setDate(dueDate.getDate() + customer.paymentTermDays);
    }

    const invoice = await prisma.customerInvoice.create({
      data: {
        invoiceNo,
        customerId: customer.id,
        shipmentId: body.shipmentId,
        poId: shipment.poId, // Keep the primary PO reference
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
        currency: shipment.po.currency || 'USD',
        subtotal,
        adjustments,
        totalAmount,
        amountDue: totalAmount,
        dueDate,
        // Shipping document fields
        shipperName: body.shipperName || null,
        shipperAddress: body.shipperAddress || null,
        consigneeName: body.consigneeName || customer.name,
        consigneeAddress: body.consigneeAddress || customer.address || null,
        forwarderName: body.forwarderName || shipment.forwarderName || null,
        forwarderAddress: body.forwarderAddress || null,
        notifyPartyName: body.notifyPartyName || null,
        notifyPartyAddress: body.notifyPartyAddress || null,
        countryOfOrigin: body.countryOfOrigin || 'China',
        incoterms: body.incoterms || shipment.shippingTerms || 'FOB',
        grossWeight,
        netWeight,
        totalCartons,
        bankDetails: body.bankDetails,
        notes: body.notes,
        lineItems: { create: lineItems },
      },
      include: { customer: true, lineItems: true, shipment: true },
    });
    return NextResponse.json(invoice, { status: 201 });
  }

  // ============================================================
  // MODE 2: Legacy — Generate from PO (single PO)
  // ============================================================
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: body.poId },
    include: { lineItems: { include: { style: true } }, customer: true },
  });

  if (!po) return NextResponse.json({ error: 'PO not found' }, { status: 404 });

  const lineItems = po.lineItems.map(line => ({
    poId: po.id,
    poLineItemId: line.id,
    styleNo: line.style.styleNo,
    color: line.color,
    description: line.style.description || '',
    htsCode: line.style.usHsCode || null,
    quantity: line.totalQty,
    unitPrice: parseFloat(line.unitPrice),
    lineTotal: parseFloat(line.lineTotal),
  }));

  const subtotal = lineItems.reduce((sum, l) => sum + l.lineTotal, 0);
  const adjustments = parseFloat(body.adjustments || 0);
  const totalAmount = subtotal + adjustments;

  // Calculate due date if shipment has ROG
  let dueDate = null;
  const shipment = await prisma.shipment.findFirst({
    where: { poId: body.poId, rogDate: { not: null } },
    orderBy: { rogDate: 'desc' },
  });
  if (shipment?.rogDate) {
    dueDate = new Date(shipment.rogDate);
    dueDate.setDate(dueDate.getDate() + po.customer.paymentTermDays);
  }

  const invoice = await prisma.customerInvoice.create({
    data: {
      invoiceNo,
      customerId: po.customerId,
      poId: body.poId,
      currency: po.currency,
      subtotal,
      adjustments,
      totalAmount,
      amountDue: totalAmount,
      dueDate,
      incoterms: po.shippingTerms || 'FOB',
      countryOfOrigin: body.countryOfOrigin || 'China',
      bankDetails: body.bankDetails,
      notes: body.notes,
      lineItems: { create: lineItems },
    },
    include: { customer: true, lineItems: true },
  });
  return NextResponse.json(invoice, { status: 201 });
}
