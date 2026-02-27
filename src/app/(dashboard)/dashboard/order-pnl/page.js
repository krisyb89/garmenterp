// src/app/(dashboard)/dashboard/order-pnl/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

function fmt2(n) {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderPnLPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerFilter, setCustomerFilter] = useState('');

  useEffect(() => {
    fetch('/api/order-pnl')
      .then(r => r.json())
      .then(d => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading P&L data...</div>;

  const customers = [...new Set(orders.map(p => p.customer).filter(Boolean))].sort();
  const filtered = customerFilter ? orders.filter(p => p.customer === customerFilter) : orders;

  const totalEstRevenue = filtered.reduce((s, p) => s + (p.estRevenue || 0), 0);
  const totalActRevenue = filtered.reduce((s, p) => s + (p.actRevenue || p.estRevenue || 0), 0);
  const totalCost = filtered.reduce((s, p) => s + (p.totalCosts || 0), 0);
  const totalEstProfit = totalEstRevenue - totalCost;
  const avgEstMargin = totalEstRevenue > 0 ? ((totalEstProfit / totalEstRevenue) * 100).toFixed(1) : 0;
  const hasAnyActual = filtered.some(p => p.isActual);

  return (
    <div>
      <PageHeader title="Order P&L" subtitle="Profitability analysis by purchase order (all amounts in CNY)" />

      <div className="flex items-end gap-4 mb-4">
        <div>
          <label className="label">Customer</label>
          <select className="input-field" value={customerFilter} onChange={e => setCustomerFilter(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="text-sm text-gray-400">{filtered.length} orders</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Est Revenue</div>
          <div className="text-xl font-bold text-blue-600">¥{fmt2(totalEstRevenue)}</div>
        </div>
        {hasAnyActual && (
          <div className="card text-center">
            <div className="text-xs text-gray-500">Act Revenue</div>
            <div className="text-xl font-bold text-blue-700">¥{fmt2(totalActRevenue)}</div>
          </div>
        )}
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Costs</div>
          <div className="text-xl font-bold text-red-600">¥{fmt2(totalCost)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Est Profit</div>
          <div className={`text-xl font-bold ${totalEstProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>¥{fmt2(totalEstProfit)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Avg Margin</div>
          <div className={`text-xl font-bold ${avgEstMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{avgEstMargin}%</div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>PO#</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Est Revenue</th>
              <th>Act Revenue</th>
              <th>Costs</th>
              <th>Est Profit</th>
              <th>Est Margin</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(po => (
              <tr key={po.id}>
                <td><Link href={`/dashboard/purchase-orders/${po.id}`} className="text-blue-600 font-medium">{po.poNo}</Link></td>
                <td>{po.customer}</td>
                <td>{(po.totalQty || 0).toLocaleString()}</td>
                <td>¥{fmt2(po.estRevenue)}</td>
                <td>
                  {po.isActual ? (
                    <span>
                      ¥{fmt2(po.actRevenue)}
                      {po.revenueVariance != null && po.revenueVariance !== 0 && (
                        <span className={`text-xs ml-1 ${po.revenueVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({po.revenueVariance > 0 ? '+' : ''}{fmt2(po.revenueVariance)})
                        </span>
                      )}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="text-red-600">¥{fmt2(po.totalCosts)}</td>
                <td className={po.estProfit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>¥{fmt2(po.estProfit)}</td>
                <td className={`font-bold ${po.estMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {po.estMargin}%
                </td>
                <td>
                  {po.isActual ? (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Actual</span>
                  ) : (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Est</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
