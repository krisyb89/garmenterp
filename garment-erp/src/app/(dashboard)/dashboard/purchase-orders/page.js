// src/app/(dashboard)/dashboard/purchase-orders/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/purchase-orders?${params}`)
      .then(r => r.json())
      .then(d => setPOs(d.purchaseOrders || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const columns = [
    { key: 'poNo', label: 'PO#', isLink: true },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name },
    { key: 'orderDate', label: 'Order Date', render: r => new Date(r.orderDate).toLocaleDateString() },
    { key: 'totalQty', label: 'Total Qty', render: r => r.totalQty?.toLocaleString() },
    { key: 'totalAmount', label: 'Amount', render: r => `${r.currency} ${parseFloat(r.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { key: 'shipByDate', label: 'Ship By', render: r => r.shipByDate ? new Date(r.shipByDate).toLocaleDateString() : '—' },
    { key: 'styles', label: 'Styles', render: r => r.lineItems?.length || 0 },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  const statuses = ['', 'RECEIVED', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'INVOICED', 'CLOSED'];

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Customer purchase orders" action={{ href: '/dashboard/purchase-orders/new', label: '+ New PO' }} />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={pos} linkPrefix="/dashboard/purchase-orders" />}
    </div>
  );
}
