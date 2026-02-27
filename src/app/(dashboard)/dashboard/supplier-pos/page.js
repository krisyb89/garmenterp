// src/app/(dashboard)/dashboard/supplier-pos/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function SupplierPOsPage() {
  const [spos, setSPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/supplier-pos')
      .then(r => {
        if (!r.ok) throw new Error(`Server error (${r.status})`);
        return r.json();
      })
      .then(d => setSPOs(d.supplierPOs || []))
      .catch(err => {
        console.error('[SupplierPOsPage] fetch error:', err);
        setError(err.message || 'Failed to load supplier POs');
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'spoNo', label: 'SPO#', isLink: true },
    { key: 'supplier', label: 'Supplier', render: r => `${r.supplier?.name || '—'} (${(r.supplier?.type || '').replace(/_/g, ' ')})` },
    { key: 'customerPO', label: 'Customer PO', render: r => r.customerPO?.poNo || '—' },
    { key: 'orderDate', label: 'Date', render: r => r.orderDate ? new Date(r.orderDate).toLocaleDateString() : '—' },
    { key: 'deliveryDate', label: 'Delivery', render: r => r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : '—' },
    { key: 'totalAmount', label: 'Amount', render: r => `${r.currency || ''} ${parseFloat(r.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'items', label: 'Items', render: r => r.lineItems?.length || 0 },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Supplier Purchase Orders" subtitle="Material and service procurement" action={{ href: '/dashboard/supplier-pos/new', label: '+ New Supplier PO' }} />
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-3">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Reload Page</button>
        </div>
      ) : (
        <DataTable columns={columns} data={spos} linkPrefix="/dashboard/supplier-pos" />
      )}
    </div>
  );
}
