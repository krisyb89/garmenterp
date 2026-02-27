// src/app/(dashboard)/dashboard/qc/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function QCPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/production-orders').then(r => r.json()).then(d => setOrders(d.productionOrders || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));

  return (
    <div>
      <PageHeader title="QC / Inspection" subtitle="Quality control and inspection tracking" />

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead><tr><th>Prod Order#</th><th>PO#</th><th>Customer</th><th>Style</th><th>Factory</th><th>Qty</th><th>Inspections</th><th>Status</th></tr></thead>
          <tbody>
            {activeOrders.map(o => (
              <tr key={o.id}>
                <td className="font-medium">{o.prodOrderNo}</td>
                <td>{o.po?.poNo}</td>
                <td>{o.po?.customer?.name}</td>
                <td>{o.styleNo}</td>
                <td>{o.factory?.name}</td>
                <td>{o.totalQty?.toLocaleString()}</td>
                <td>{o._count?.inspections || 0}</td>
                <td><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {activeOrders.length === 0 && <p className="text-center py-8 text-gray-400">No active production orders</p>}
      </div>
    </div>
  );
}
