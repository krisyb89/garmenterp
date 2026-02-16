// src/app/(dashboard)/dashboard/production/[id]/page.js
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const PROD_STATUSES = ['PLANNED','MATERIAL_ISSUED','CUTTING','SEWING','WASHING_FINISHING','QC_INSPECTION','PACKING','READY_TO_SHIP','COMPLETED','ON_HOLD','CANCELLED'];

export default function ProductionDetailPage({ params }) {
  const { id } = use(params);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/production-orders/${id}`).then(r => r.json()).then(setOrder).finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(status) {
    await fetch(`/api/production-orders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setOrder({ ...order, status });
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!order) return <div className="text-center py-20 text-red-500">Not found</div>;

  const stages = ['CUTTING', 'SEWING', 'WASHING_FINISHING', 'QC_INSPECTION', 'PACKING'];
  const stageMap = {};
  (order.stageTracking || []).forEach(s => { stageMap[s.stage] = s; });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/production" className="text-sm text-blue-600 mb-2 inline-block">← Production Orders</Link>
          <h1 className="text-2xl font-bold">{order.prodOrderNo}</h1>
          <p className="text-gray-500 text-sm">PO: {order.po?.poNo} | {order.po?.customer?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <select className="select-field w-auto text-sm" value={order.status} onChange={e => updateStatus(e.target.value)}>
            {PROD_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card text-center"><div className="text-xs text-gray-500">Style</div><div className="font-bold">{order.styleNo}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Color</div><div className="font-bold">{order.color || '—'}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Qty</div><div className="text-xl font-bold">{order.totalQty?.toLocaleString()}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Factory</div><div className="font-bold">{order.factory?.name}</div><div className="text-xs text-gray-400">{order.factory?.country}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">CMT Rate</div><div className="font-bold">{order.cmtRate ? `${order.cmtCurrency} ${order.cmtRate}` : '—'}</div></div>
      </div>

      {/* Production Stage Pipeline */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Production Pipeline</h2>
        <div className="flex gap-2">
          {stages.map((stage, i) => {
            const tracked = stageMap[stage];
            const isActive = order.status === stage;
            const isPast = PROD_STATUSES.indexOf(order.status) > PROD_STATUSES.indexOf(stage);
            return (
              <div key={stage} className={`flex-1 rounded-lg p-3 text-center text-xs font-medium transition-colors
                ${isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' :
                  isPast ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                <div>{isPast ? '✓' : isActive ? '▶' : '○'}</div>
                <div className="mt-1">{stage.replace(/_/g, ' ')}</div>
                {tracked?.actualDate && <div className="text-[10px] mt-1">{new Date(tracked.actualDate).toLocaleDateString()}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Size Breakdown */}
        {order.sizeBreakdown && (
          <div className="card">
            <h2 className="font-semibold mb-4">Size Breakdown</h2>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(order.sizeBreakdown).map(([size, qty]) => (
                <div key={size} className="text-center bg-gray-50 rounded-lg px-4 py-2">
                  <div className="text-xs text-gray-500">{size}</div>
                  <div className="font-bold">{qty}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QC Inspections */}
        <div className="card">
          <h2 className="font-semibold mb-4">QC Inspections ({order.inspections?.length || 0})</h2>
          {order.inspections?.length === 0 ? (
            <p className="text-sm text-gray-400">No inspections recorded</p>
          ) : (
            <div className="space-y-2">
              {order.inspections.map(insp => (
                <div key={insp.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-sm">{insp.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(insp.inspectionDate).toLocaleDateString()}</span>
                  </div>
                  <StatusBadge status={insp.result} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Material Issues */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Material Issues</h2>
          {order.materialIssues?.length === 0 ? (
            <p className="text-sm text-gray-400">No materials issued</p>
          ) : (
            <table className="table-base">
              <thead><tr><th>Material</th><th>Color</th><th>Qty</th><th>Unit</th><th>Issued To</th><th>Date</th></tr></thead>
              <tbody>
                {order.materialIssues?.map(mi => (
                  <tr key={mi.id}>
                    <td>{mi.materialDesc}</td><td>{mi.color || '—'}</td>
                    <td>{parseFloat(mi.quantity).toLocaleString()}</td><td>{mi.unit}</td>
                    <td>{mi.issuedTo}</td><td>{new Date(mi.issuedDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
