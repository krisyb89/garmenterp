// src/app/api/order-pnl/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toPlain } from '@/lib/serialize';

const ACTUAL_INVOICE_STATUSES = ['SENT', 'ACKNOWLEDGED', 'PARTIALLY_PAID', 'FULLY_PAID'];

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch all non-cancelled POs (lightweight)
    const pos = await prisma.purchaseOrder.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        id: true,
        poNo: true,
        customerId: true,
        totalAmount: true,
        totalQty: true,
        currency: true,
        exchangeRate: true,
        status: true,
        orderDate: true,
        customer: { select: { name: true } },
      },
      orderBy: { orderDate: 'desc' },
    });

    // 2. Fetch all costs grouped by poId (single query)
    const allCosts = await prisma.orderCost.groupBy({
      by: ['poId'],
      _sum: { totalCostBase: true },
    });
    const costMap = {};
    allCosts.forEach(c => { costMap[c.poId] = parseFloat(c._sum.totalCostBase || 0); });

    // 3. Fetch all qualifying invoices grouped by poId (single query)
    const allInvoices = await prisma.customerInvoice.findMany({
      where: { status: { in: ACTUAL_INVOICE_STATUSES } },
      select: { poId: true, totalAmount: true },
    });
    const invoiceMap = {};
    allInvoices.forEach(inv => {
      if (!invoiceMap[inv.poId]) invoiceMap[inv.poId] = { total: 0, count: 0 };
      invoiceMap[inv.poId].total += parseFloat(inv.totalAmount || 0);
      invoiceMap[inv.poId].count += 1;
    });

    // 4. Assemble P&L per PO in memory
    const result = pos.map(po => {
      const xr = parseFloat(po.exchangeRate || 1);
      const estRevenue = parseFloat(po.totalAmount || 0) * xr;
      const costs = costMap[po.id] || 0;
      const inv = invoiceMap[po.id];
      const isActual = !!inv;
      const actRevenue = isActual ? inv.total * xr : null;

      const estProfit = estRevenue - costs;
      const estMargin = estRevenue > 0 ? Math.round(((estProfit / estRevenue) * 100) * 100) / 100 : 0;
      const actProfit = isActual ? actRevenue - costs : null;
      const actMargin = isActual && actRevenue > 0 ? Math.round(((actProfit / actRevenue) * 100) * 100) / 100 : null;

      return {
        id: po.id,
        poNo: po.poNo,
        customer: po.customer?.name,
        customerId: po.customerId,
        totalQty: po.totalQty,
        currency: po.currency,
        status: po.status,
        estRevenue: Math.round(estRevenue * 100) / 100,
        actRevenue: isActual ? Math.round(actRevenue * 100) / 100 : null,
        totalCosts: Math.round(costs * 100) / 100,
        estProfit: Math.round(estProfit * 100) / 100,
        actProfit: actProfit != null ? Math.round(actProfit * 100) / 100 : null,
        estMargin,
        actMargin,
        isActual,
        invoiceCount: inv?.count || 0,
        revenueVariance: isActual ? Math.round((actRevenue - estRevenue) * 100) / 100 : null,
      };
    });

    return NextResponse.json({ orders: result });
  } catch (err) {
    console.error('[GET /api/order-pnl] error:', err);
    return NextResponse.json({ error: 'Failed to fetch P&L data' }, { status: 500 });
  }
}
