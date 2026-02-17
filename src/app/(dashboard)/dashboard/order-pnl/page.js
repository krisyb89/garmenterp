// src/app/(dashboard)/dashboard/order-pnl/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function OrderPnLPage() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then(r => r.json())
      .then(async (d) => {
        const posWithPnl = await Promise.all(
          (d.purchaseOrders || []).filter(po => po.status !== 'CANCELLED').map(async (po) => {
            try {
              const costRes = await fetch(`/api/order-costs?poId=${po.id}`);
              const costData = await costRes.json();
              return { ...po, pnl: costData.pnl };
            } catch { return { ...po, pnl: null }; }
          })
        );
        setPOs(posWithPnl);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading P&L data...</div>;

  const totalRevenue = pos.reduce((s, p) => s + (p.pnl?.revenue || 0), 0);
  const totalCost = pos.reduce((s, p) => s + (p.pnl?.totalCost || 0), 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div>
      <PageHeader title="Order P&L" subtitle="Profitability analysis by purchase order" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card text-center"><div className="text-xs text-gray-500">Total Revenue</div><div className="text-xl font-bold text-blue-600">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Total Costs</div><div className="text-xl font-bold text-red-600">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Gross Profit</div><div className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Avg Margin</div><div className={`text-xl font-bold ${avgMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{avgMargin}%</div></div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr><th>PO#</th><th>Customer</th><th>Qty</th><th>Revenue</th><th>Costs</th><th>Gross Profit</th><th>Margin %</th></tr>
          </thead>
          <tbody>
            {pos.map(po => {
              const rev = po.pnl?.revenue || 0;
              const cost = po.pnl?.totalCost || 0;
              const profit = rev - cost;
              const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : '—';
              return (
                <tr key={po.id}>
                  <td><Link href={`/dashboard/purchase-orders/${po.id}`} className="text-blue-600 font-medium">{po.poNo}</Link></td>
                  <td>{po.customer?.name}</td>
                  <td>{po.totalQty?.toLocaleString()}</td>
                  <td>${rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="text-red-600">${cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className={`font-bold ${parseFloat(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}{margin !== '—' ? '%' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
