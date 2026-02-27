// src/lib/pnl.js
// Centralized P&L calculation library
import prisma from '@/lib/prisma';

// Invoice statuses that count as "actual" revenue
const ACTUAL_INVOICE_STATUSES = ['SENT', 'ACKNOWLEDGED', 'PARTIALLY_PAID', 'FULLY_PAID'];

// ── Order-level P&L (Estimated + Actual) ─────────────────────────────────────
export async function getOrderPnL(poId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      totalAmount: true,
      totalQty: true,
      shippingTerms: true,
      shipByDate: true,
      ihDate: true,
      orderDate: true,
      currency: true,
      exchangeRate: true,
      lineItems: {
        select: {
          id: true,
          styleId: true,
          color: true,
          totalQty: true,
          lineTotal: true,
          style: { select: { styleNo: true } },
        },
      },
    },
  });
  if (!po) return null;

  // Get all order costs for this PO
  const costs = await prisma.orderCost.findMany({
    where: { poId },
    orderBy: { category: 'asc' },
  });

  // Get production orders for this PO (production invoice totals for P&L)
  const productionOrders = await prisma.productionOrder.findMany({
    where: { poId },
    select: {
      id: true,
      prodOrderNo: true,
      prodInvoiceQty: true,
      prodInvoiceUnitPrice: true,
      prodInvoiceCurrency: true,
      prodInvoiceTotal: true,
      vatRefundRate: true,
      factory: { select: { name: true } },
    },
  });

  // Get invoices with status >= SENT
  const invoices = await prisma.customerInvoice.findMany({
    where: {
      poId,
      status: { in: ACTUAL_INVOICE_STATUSES },
    },
    select: {
      totalAmount: true,
      invoiceDate: true,
      lineItems: {
        select: { styleNo: true, color: true, quantity: true, unitPrice: true, lineTotal: true },
      },
    },
  });

  const xr = parseFloat(po.exchangeRate || 1);
  const estRevenue = parseFloat(po.totalAmount || 0) * xr;
  const actRevenue = invoices.reduce((s, inv) => s + parseFloat(inv.totalAmount || 0) * xr, 0);
  const isActual = invoices.length > 0;

  // OrderCost-based costs (fabric, trims, freight, etc.)
  const orderCostTotal = costs.reduce((s, c) => s + parseFloat(c.totalCostBase || 0), 0);

  // Production invoice costs (sum of prodInvoiceTotal in CNY from all production orders)
  const productionCostTotal = productionOrders.reduce(
    (s, p) => s + parseFloat(p.prodInvoiceTotal || 0), 0
  );

  // VAT refund — per production order: each factory's invoice × its own VAT refund rate
  // This reflects that different suppliers may have different VAT refund rates
  const vatRefund = productionOrders.reduce(
    (s, p) => s + parseFloat(p.prodInvoiceTotal || 0) * parseFloat(p.vatRefundRate || 0) / 100, 0
  );

  // Grand total costs (before VAT refund offset)
  const totalCosts = orderCostTotal + productionCostTotal;
  // Net costs after VAT refund
  const netCosts = totalCosts - vatRefund;

  // Cost breakdown by category (order costs only)
  const costSummary = {};
  costs.forEach(c => {
    const cat = c.category;
    if (!costSummary[cat]) costSummary[cat] = 0;
    costSummary[cat] += parseFloat(c.totalCostBase || 0);
  });

  const estProfit = estRevenue - netCosts;
  const actProfit = actRevenue - netCosts;
  const estMargin = estRevenue > 0 ? (estProfit / estRevenue) * 100 : 0;
  const actMargin = actRevenue > 0 ? (actProfit / actRevenue) * 100 : 0;

  return {
    isActual,
    estRevenue,
    actRevenue: isActual ? actRevenue : null,
    orderCostTotal: round2(orderCostTotal),
    productionCostTotal: round2(productionCostTotal),
    vatRefund: round2(vatRefund),
    totalCosts: round2(totalCosts),
    netCosts: round2(netCosts),
    estProfit: round2(estProfit),
    actProfit: isActual ? round2(actProfit) : null,
    estMargin: round2(estMargin),
    actMargin: isActual ? round2(actMargin) : null,
    revenueVariance: isActual ? round2(actRevenue - estRevenue) : null,
    costSummary,
    totalQty: po.totalQty,
    currency: po.currency,
    costs,
    productionOrders,
    invoiceCount: invoices.length,
  };
}

// ── Color-Level P&L ──────────────────────────────────────────────────────────
export async function getColorLevelPnL(poId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    select: {
      totalAmount: true,
      totalQty: true,
      currency: true,
      exchangeRate: true,
      lineItems: {
        include: {
          style: { select: { styleNo: true, description: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!po) return null;

  const totalPORevenue = parseFloat(po.totalAmount || 0) * parseFloat(po.exchangeRate || 1);

  // Get all costs for this PO, grouped by poLineItemId
  const costs = await prisma.orderCost.findMany({
    where: { poId },
  });

  // Get production orders for this PO — allocate invoice costs to matching style+color
  const prodOrders = await prisma.productionOrder.findMany({
    where: { poId },
    select: { styleNo: true, color: true, prodInvoiceTotal: true, vatRefundRate: true },
  });

  // Separate allocated vs unallocated costs
  const directCostsByLine = {};  // poLineItemId → total
  let unallocatedTotal = 0;

  costs.forEach(c => {
    const amt = parseFloat(c.totalCostBase || 0);
    if (c.poLineItemId) {
      if (!directCostsByLine[c.poLineItemId]) directCostsByLine[c.poLineItemId] = 0;
      directCostsByLine[c.poLineItemId] += amt;
    } else {
      unallocatedTotal += amt;
    }
  });

  // Map production invoice costs to line items by styleNo+color match (net of VAT refund)
  const prodCostsByLine = {};  // poLineItemId → net production cost
  let unallocatedProdTotal = 0;
  prodOrders.forEach(p => {
    const gross   = parseFloat(p.prodInvoiceTotal || 0);
    if (gross <= 0) return;
    const vatRate = parseFloat(p.vatRefundRate || 0);
    const net     = gross - (gross * vatRate / 100);
    // Match to line item by styleNo + color
    const matched = po.lineItems.find(
      l => l.style?.styleNo === p.styleNo && l.color === p.color
    );
    if (matched) {
      if (!prodCostsByLine[matched.id]) prodCostsByLine[matched.id] = 0;
      prodCostsByLine[matched.id] += net;
    } else {
      unallocatedProdTotal += net;
    }
  });

  // Get invoices for actual revenue per color
  const invoices = await prisma.customerInvoice.findMany({
    where: { poId, status: { in: ACTUAL_INVOICE_STATUSES } },
    select: {
      lineItems: {
        select: { styleNo: true, color: true, quantity: true, lineTotal: true },
      },
    },
  });
  const isActual = invoices.length > 0;

  // Build invoice revenue map by styleNo+color
  const invoiceRevenueMap = {};
  invoices.forEach(inv => {
    inv.lineItems.forEach(li => {
      const key = `${li.styleNo}||${li.color}`;
      if (!invoiceRevenueMap[key]) invoiceRevenueMap[key] = 0;
      invoiceRevenueMap[key] += parseFloat(li.lineTotal || 0) * parseFloat(po.exchangeRate || 1);
    });
  });

  // Build per-line P&L
  const byColor = po.lineItems.map(line => {
    const lineRevenue = parseFloat(line.lineTotal || 0) * parseFloat(po.exchangeRate || 1);
    const revenueShare = totalPORevenue > 0 ? lineRevenue / totalPORevenue : 0;

    const directCosts  = directCostsByLine[line.id] || 0;
    const prodCosts    = prodCostsByLine[line.id] || 0;
    // Allocate unallocated order costs + unallocated production costs by revenue share
    const allocatedCosts = (unallocatedTotal + unallocatedProdTotal) * revenueShare;
    const totalLineCosts = directCosts + prodCosts + allocatedCosts;

    // Actual revenue from invoice
    const invoiceKey = `${line.style.styleNo}||${line.color}`;
    const actLineRevenue = invoiceRevenueMap[invoiceKey] || 0;

    const estMargin = lineRevenue > 0 ? ((lineRevenue - totalLineCosts) / lineRevenue) * 100 : 0;
    const actMargin = actLineRevenue > 0 ? ((actLineRevenue - totalLineCosts) / actLineRevenue) * 100 : 0;

    return {
      poLineItemId:     line.id,
      styleNo:          line.style.styleNo,
      styleDescription: line.style.description,
      color:            line.color,
      qty:              line.totalQty,
      estRevenue:       round2(lineRevenue),
      actRevenue:       isActual ? round2(actLineRevenue) : null,
      directCosts:      round2(directCosts),
      prodCosts:        round2(prodCosts),
      allocatedCosts:   round2(allocatedCosts),
      totalCosts:       round2(totalLineCosts),
      estProfit:        round2(lineRevenue - totalLineCosts),
      actProfit:        isActual ? round2(actLineRevenue - totalLineCosts) : null,
      estMargin:        round2(estMargin),
      actMargin:        isActual ? round2(actMargin) : null,
    };
  });

  return { byColor, isActual, currency: po.currency };
}

// ── Period date anchor ───────────────────────────────────────────────────────
export function getPeriodDate(po) {
  const terms = (po.shippingTerms || '').toUpperCase();
  if (terms === 'FOB' || terms === 'CIF') {
    return po.shipByDate || po.orderDate;
  }
  if (terms === 'DDP' || terms === 'EXW') {
    return po.ihDate || po.orderDate;
  }
  return po.shipByDate || po.orderDate;
}

// ── Period bucketing ─────────────────────────────────────────────────────────
export function getPeriodKey(date, period) {
  if (!date) return null;
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed

  switch (period) {
    case 'MONTHLY':
      return `${y}-${String(m + 1).padStart(2, '0')}`;
    case 'QUARTERLY': {
      const q = Math.floor(m / 3) + 1;
      return `${y}-Q${q}`;
    }
    case 'ANNUAL':
      return `${y}`;
    default:
      return `${y}-${String(m + 1).padStart(2, '0')}`;
  }
}

export function getPeriodLabel(key, period) {
  if (!key) return 'Undated';
  switch (period) {
    case 'MONTHLY': {
      const [y, m] = key.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[parseInt(m) - 1]} ${y}`;
    }
    case 'QUARTERLY':
      return key.replace('-', ' ');
    case 'ANNUAL':
      return key;
    default:
      return key;
  }
}

// ── Period P&L Summary ───────────────────────────────────────────────────────
export async function getPeriodPnL({ period = 'MONTHLY', startDate, endDate } = {}) {
  // Fetch all non-cancelled POs
  const where = { status: { not: 'CANCELLED' } };

  const pos = await prisma.purchaseOrder.findMany({
    where,
    select: {
      id: true,
      poNo: true,
      customerId: true,
      totalAmount: true,
      totalQty: true,
      shippingTerms: true,
      shipByDate: true,
      ihDate: true,
      orderDate: true,
      currency: true,
      exchangeRate: true,
      status: true,
      customer: { select: { name: true } },
    },
    orderBy: { orderDate: 'desc' },
  });

  // Get all order costs grouped by poId
  const allCosts = await prisma.orderCost.groupBy({
    by: ['poId'],
    _sum: { totalCostBase: true },
  });
  const costMap = {};
  allCosts.forEach(c => { costMap[c.poId] = parseFloat(c._sum.totalCostBase || 0); });

  // Get all production orders with invoice totals and VAT refund rate
  // Needed to compute both production costs and VAT refund per PO
  const allProdOrders = await prisma.productionOrder.findMany({
    select: { poId: true, prodInvoiceTotal: true, vatRefundRate: true },
  });
  const prodCostMap = {};   // poId → total production invoice cost
  const vatRefundMap = {};  // poId → total VAT refund benefit
  allProdOrders.forEach(p => {
    const total    = parseFloat(p.prodInvoiceTotal || 0);
    const vatRate  = parseFloat(p.vatRefundRate    || 0);
    if (!prodCostMap[p.poId])  prodCostMap[p.poId]  = 0;
    if (!vatRefundMap[p.poId]) vatRefundMap[p.poId] = 0;
    prodCostMap[p.poId]  += total;
    vatRefundMap[p.poId] += total * vatRate / 100;
  });

  // Get all invoices for actual revenue
  const allInvoices = await prisma.customerInvoice.findMany({
    where: { status: { in: ACTUAL_INVOICE_STATUSES } },
    select: { poId: true, totalAmount: true, invoiceDate: true },
  });
  const invoiceMap = {};
  allInvoices.forEach(inv => {
    if (!invoiceMap[inv.poId]) invoiceMap[inv.poId] = { total: 0, count: 0 };
    invoiceMap[inv.poId].total += parseFloat(inv.totalAmount || 0);
    invoiceMap[inv.poId].count += 1;
  });

  // Group POs into period buckets
  const buckets = {};

  pos.forEach(po => {
    const anchorDate = getPeriodDate(po);
    if (!anchorDate) return; // skip POs with no date

    // Filter by date range if provided
    const d = new Date(anchorDate);
    if (startDate && d < new Date(startDate)) return;
    if (endDate && d > new Date(endDate)) return;

    const key = getPeriodKey(anchorDate, period);
    if (!buckets[key]) {
      buckets[key] = {
        period: key,
        label: getPeriodLabel(key, period),
        poCount: 0,
        totalQty: 0,
        estRevenue: 0,
        actRevenue: 0,
        totalCosts: 0,
        hasActual: false,
        pos: [],
      };
    }

    const b = buckets[key];
    const xr = parseFloat(po.exchangeRate || 1);
    const estRev = parseFloat(po.totalAmount || 0) * xr;
    const inv = invoiceMap[po.id];
    const orderCosts = costMap[po.id] || 0;
    const prodCosts = prodCostMap[po.id] || 0;
    const vatRefund = vatRefundMap[po.id] || 0;  // sum of each factory's prodInvoice × vatRate
    const netCosts = orderCosts + prodCosts - vatRefund;
    const isActual = !!inv;

    b.poCount += 1;
    b.totalQty += po.totalQty || 0;
    b.estRevenue += estRev;
    b.actRevenue += isActual ? inv.total * xr : estRev; // Use est if no invoices yet
    b.totalCosts += netCosts;
    if (isActual) b.hasActual = true;
    b.pos.push({
      id: po.id,
      poNo: po.poNo,
      customer: po.customer?.name,
      estRevenue: round2(estRev),
      actRevenue: isActual ? round2(inv.total * xr) : null,
      costs: round2(netCosts),
      vatRefund: round2(vatRefund),
      isActual,
    });
  });

  // Sort periods chronologically and calculate margins
  const periods = Object.values(buckets)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(b => ({
      ...b,
      estRevenue: round2(b.estRevenue),
      actRevenue: round2(b.actRevenue),
      totalCosts: round2(b.totalCosts),
      estProfit: round2(b.estRevenue - b.totalCosts),
      actProfit: round2(b.actRevenue - b.totalCosts),
      estMargin: b.estRevenue > 0 ? round2(((b.estRevenue - b.totalCosts) / b.estRevenue) * 100) : 0,
      actMargin: b.actRevenue > 0 ? round2(((b.actRevenue - b.totalCosts) / b.actRevenue) * 100) : 0,
    }));

  // Grand totals
  const totals = periods.reduce(
    (t, p) => ({
      poCount: t.poCount + p.poCount,
      totalQty: t.totalQty + p.totalQty,
      estRevenue: t.estRevenue + p.estRevenue,
      actRevenue: t.actRevenue + p.actRevenue,
      totalCosts: t.totalCosts + p.totalCosts,
    }),
    { poCount: 0, totalQty: 0, estRevenue: 0, actRevenue: 0, totalCosts: 0 }
  );
  totals.estProfit = round2(totals.estRevenue - totals.totalCosts);
  totals.actProfit = round2(totals.actRevenue - totals.totalCosts);
  totals.estMargin = totals.estRevenue > 0 ? round2(((totals.estRevenue - totals.totalCosts) / totals.estRevenue) * 100) : 0;
  totals.actMargin = totals.actRevenue > 0 ? round2(((totals.actRevenue - totals.totalCosts) / totals.actRevenue) * 100) : 0;

  return { periods, totals };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
