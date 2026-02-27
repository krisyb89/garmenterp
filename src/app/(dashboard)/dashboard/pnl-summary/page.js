// src/app/(dashboard)/dashboard/pnl-summary/page.js
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

function fmt2(n) {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function marginColor(m) {
  if (m >= 20) return 'text-green-600';
  if (m >= 10) return 'text-amber-600';
  return 'text-red-600';
}

export default function PnLSummaryPage() {
  const [period, setPeriod]     = useState('MONTHLY');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState({}); // periodKey → boolean

  // Date range: default last 12 months
  const defaultStart = new Date();
  defaultStart.setFullYear(defaultStart.getFullYear() - 1);
  const [startDate, setStartDate] = useState(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period, startDate, endDate });
    fetch(`/api/pnl/summary?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, startDate, endDate]);

  function toggleExpand(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading P&L Summary...</div>;
  if (!data) return <div className="text-center py-20 text-red-500">Failed to load P&L data</div>;

  const { periods, totals } = data;

  return (
    <div>
      <PageHeader title="P&L Summary" subtitle="Profitability by period — date anchor based on shipping terms" />

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="label">Period</label>
          <div className="flex gap-1">
            {['MONTHLY', 'QUARTERLY', 'ANNUAL'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === 'MONTHLY' ? 'Monthly' : p === 'QUARTERLY' ? 'Quarterly' : 'Annual'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Orders</div>
          <div className="text-xl font-bold">{totals.poCount}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Est Revenue</div>
          <div className="text-xl font-bold text-blue-600">${fmt2(totals.estRevenue)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Act Revenue</div>
          <div className="text-xl font-bold text-blue-700">${fmt2(totals.actRevenue)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Costs</div>
          <div className="text-xl font-bold text-red-600">${fmt2(totals.totalCosts)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Est Margin</div>
          <div className={`text-xl font-bold ${marginColor(totals.estMargin)}`}>{totals.estMargin}%</div>
        </div>
      </div>

      {/* Period Table */}
      {periods.length === 0 ? (
        <div className="card text-center text-gray-400 py-10">No orders found in this date range</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="table-base">
            <thead>
              <tr>
                <th>Period</th>
                <th># Orders</th>
                <th>Est Revenue</th>
                <th>Act Revenue</th>
                <th>Total Costs</th>
                <th>Est Profit</th>
                <th>Est Margin</th>
                <th>Act Margin</th>
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <>
                  <tr key={p.period} className="cursor-pointer hover:bg-blue-50/50" onClick={() => toggleExpand(p.period)}>
                    <td className="font-medium">
                      <span className="mr-1">{expanded[p.period] ? '▼' : '▶'}</span>
                      {p.label}
                    </td>
                    <td>{p.poCount}</td>
                    <td>${fmt2(p.estRevenue)}</td>
                    <td>
                      ${fmt2(p.actRevenue)}
                      {p.hasActual && p.actRevenue !== p.estRevenue && (
                        <span className={`text-xs ml-1 ${p.actRevenue >= p.estRevenue ? 'text-green-600' : 'text-red-600'}`}>
                          ({p.actRevenue >= p.estRevenue ? '+' : ''}{fmt2(p.actRevenue - p.estRevenue)})
                        </span>
                      )}
                    </td>
                    <td className="text-red-600">${fmt2(p.totalCosts)}</td>
                    <td className={p.estProfit >= 0 ? 'text-green-600' : 'text-red-600'}>${fmt2(p.estProfit)}</td>
                    <td className={`font-bold ${marginColor(p.estMargin)}`}>{p.estMargin}%</td>
                    <td className={`font-bold ${marginColor(p.actMargin)}`}>
                      {p.hasActual ? `${p.actMargin}%` : '—'}
                    </td>
                  </tr>
                  {/* Expanded PO list */}
                  {expanded[p.period] && p.pos?.map(po => (
                    <tr key={po.id} className="bg-gray-50/80" style={{ fontSize: 13 }}>
                      <td className="pl-8">
                        <Link href={`/dashboard/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800">
                          {po.poNo}
                        </Link>
                      </td>
                      <td className="text-gray-500">{po.customer}</td>
                      <td>${fmt2(po.estRevenue)}</td>
                      <td>
                        {po.isActual ? `$${fmt2(po.actRevenue)}` : <span className="text-gray-400">—</span>}
                        {po.isActual && <span className="text-xs text-green-600 ml-1">✓</span>}
                      </td>
                      <td className="text-red-600">${fmt2(po.costs)}</td>
                      <td className={(po.estRevenue - po.costs) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${fmt2(po.estRevenue - po.costs)}
                      </td>
                      <td className={`font-medium ${marginColor(po.estRevenue > 0 ? ((po.estRevenue - po.costs) / po.estRevenue * 100) : 0)}`}>
                        {po.estRevenue > 0 ? `${((po.estRevenue - po.costs) / po.estRevenue * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td>
                        {po.isActual && po.actRevenue > 0 ? (
                          <span className={`font-medium ${marginColor(((po.actRevenue - po.costs) / po.actRevenue) * 100)}`}>
                            {(((po.actRevenue - po.costs) / po.actRevenue) * 100).toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold" style={{ borderTop: '2px solid #e5e7eb' }}>
                <td>Total</td>
                <td>{totals.poCount}</td>
                <td>${fmt2(totals.estRevenue)}</td>
                <td>${fmt2(totals.actRevenue)}</td>
                <td className="text-red-600">${fmt2(totals.totalCosts)}</td>
                <td className={totals.estProfit >= 0 ? 'text-green-600' : 'text-red-600'}>${fmt2(totals.estProfit)}</td>
                <td className={marginColor(totals.estMargin)}>{totals.estMargin}%</td>
                <td className={marginColor(totals.actMargin)}>{totals.actMargin}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Date anchor: FOB/CIF → Ship By Date, DDP/EXW → IH Date, fallback → Order Date.
        "Actual" revenue uses invoiced amounts (status ≥ SENT).
      </p>
    </div>
  );
}
