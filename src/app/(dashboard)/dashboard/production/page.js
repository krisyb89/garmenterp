// src/app/(dashboard)/dashboard/production/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function ProductionPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/production-orders?${params}`)
      .then(r => r.json())
      .then(d => setOrders(d.productionOrders || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const columns = [
    { key: 'prodOrderNo', label: 'Prod Order#', isLink: true },
    { key: 'po', label: 'PO#', render: r => r.po?.poNo },
    { key: 'customer', label: 'Customer', render: r => r.po?.customer?.name },
    { key: 'styleNo', label: 'Style' },
    { key: 'color', label: 'Color' },
    { key: 'totalQty', label: 'Qty', render: r => r.totalQty?.toLocaleString() },
    { key: 'factory', label: 'Factory', render: r => `${r.factory?.name} (${r.factory?.country})` },
    { key: 'inHouse', label: 'Type', render: r => r.factory?.isInHouse ? '🏠 In-House' : '🏭 External' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  const statuses = ['', 'PLANNED', 'MATERIAL_ISSUED', 'CUTTING', 'SEWING', 'WASHING_FINISHING', 'QC_INSPECTION', 'PACKING', 'READY_TO_SHIP', 'COMPLETED'];

  return (
    <div>
      <PageHeader title="Production Orders" subtitle="Track manufacturing across all factories" />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={orders} linkPrefix="/dashboard/production" />}
    </div>
  );
}
