// src/app/api/purchase-orders/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { checkPermission } from '@/lib/authorization';
import { logPOChange } from '@/lib/audit';

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const search = searchParams.get('search') || '';

    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { poNo:     { contains: search } },
        { store:    { contains: search } },
        { brand:    { contains: search } },
        { customer: { name: { contains: search } } },
        { lineItems: { some: { style: { styleNo: { contains: search } } } } },
      ];
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: [
        { ihDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        customer: { select: { name: true, code: true } },
        lineItems: {
          select: { id: true, color: true, totalQty: true, style: { select: { styleNo: true } } },
        },
      },
    });

    return NextResponse.json({ purchaseOrders: pos });
  } catch (error) {
    console.error('PO GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch POs' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Phase 0: Check authorization
  const authCheck = await checkPermission(user, 'create', 'PO');
  if (!authCheck.allowed) {
    return NextResponse.json({ error: authCheck.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { poNo, customerId, orderDate, shipByDate, cancelDate, shippingTerms,
            portOfLoading, portOfDischarge, currency, exchangeRate, store, brand,
            specialInstructions, notes, lineItems } = body;

    if (!poNo || !customerId) {
      return NextResponse.json({ error: 'PO# and Customer are required' }, { status: 400 });
    }

    // Check duplicate PO#
    const existing = await prisma.purchaseOrder.findUnique({ where: { poNo } });
    if (existing) {
      return NextResponse.json({ error: 'PO# already exists' }, { status: 400 });
    }

    // Calculate totals from line items
    let totalQty = 0;
    let totalAmount = 0;

    const processedLines = (lineItems || []).map(line => {
      const sizeBreakdown = line.sizeBreakdown || {};
      const lineQty = Object.values(sizeBreakdown).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
      const lineTotal = lineQty * parseFloat(line.unitPrice || 0);
      totalQty += lineQty;
      totalAmount += lineTotal;

      const shippingOrders = Array.isArray(line.shippingOrders)
        ? line.shippingOrders.map(({ soNo, dc, address, sizeBreakdown: sb }) => ({
            soNo: soNo || '',
            dc:   dc   || '',
            address: address || '',
            sizeBreakdown: Object.fromEntries(
              Object.entries(sb || {}).map(([k, v]) => [k, parseInt(v) || 0])
            ),
          }))
        : null;

      return {
        styleId:        line.styleId,
        color:          line.color,
        colorCode:      line.colorCode,
        unitPrice:      line.unitPrice,
        sizeBreakdown:  sizeBreakdown,
        totalQty:       lineQty,
        lineTotal:      lineTotal,
        shippingOrders: shippingOrders,
        deliveryDate:   line.deliveryDate ? new Date(line.deliveryDate) : null,
        notes:          line.notes,
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        poNo,
        customerId,
        orderDate: new Date(orderDate || Date.now()),
        shipByDate: shipByDate ? new Date(shipByDate) : null,
        cancelDate: cancelDate ? new Date(cancelDate) : null,
        shippingTerms: shippingTerms || 'FOB',
        portOfLoading,
        portOfDischarge,
        currency: currency || 'USD',
        exchangeRate: body.exchangeRate || 1,
        store:    store    || null,
        brand:    brand    || null,
        totalQty,
        totalAmount,
        specialInstructions,
        notes,
        status: 'RECEIVED',
        // Phase 0: Track creator
        createdByUserId: user.id,
        lineItems: {
          create: processedLines,
        },
      },
      include: {
        customer: { select: { name: true } },
        lineItems: { include: { style: { select: { styleNo: true } } } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    // Phase 0: Log activity
    await logPOChange(user, 'CREATE', po.id, null, po, request);

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error('PO POST error:', error);
    return NextResponse.json({ error: 'Failed to create PO' }, { status: 500 });
  }
}
