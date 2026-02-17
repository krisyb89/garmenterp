// src/app/api/purchase-orders/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
        { poNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, code: true } },
        lineItems: {
          include: { style: { select: { styleNo: true, description: true } } },
        },
        _count: { select: { productionOrders: true, shipments: true } },
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

  try {
    const body = await request.json();
    const { poNo, customerId, orderDate, shipByDate, cancelDate, shippingTerms,
            portOfLoading, portOfDischarge, currency, specialInstructions, notes, lineItems } = body;

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

      return {
        styleId: line.styleId,
        color: line.color,
        colorCode: line.colorCode,
        unitPrice: line.unitPrice,
        sizeBreakdown: sizeBreakdown,
        totalQty: lineQty,
        lineTotal: lineTotal,
        deliveryDate: line.deliveryDate ? new Date(line.deliveryDate) : null,
        notes: line.notes,
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
        totalQty,
        totalAmount,
        specialInstructions,
        notes,
        status: 'RECEIVED',
        lineItems: {
          create: processedLines,
        },
      },
      include: {
        customer: { select: { name: true } },
        lineItems: { include: { style: { select: { styleNo: true } } } },
      },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error) {
    console.error('PO POST error:', error);
    return NextResponse.json({ error: 'Failed to create PO' }, { status: 500 });
  }
}
