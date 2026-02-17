// src/app/(dashboard)/dashboard/srs/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function SRSListPage() {
  const [srsList, setSrsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/srs?${params}`)
      .then(r => r.json())
      .then(d => setSrsList(d.srsList || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const columns = [
    { key: 'srsNo', label: 'SRS#', isLink: true },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name },
    { key: 'brand', label: 'Brand', render: r => r.brand || '—' },
    { key: 'styleNo', label: 'Style #', render: r => r.styleNo },
    { key: 'colorPrint', label: 'Color / Print', render: r => r.colorPrint || '—' },
    { key: 'deadline', label: 'Deadline', render: r => r.deadline ? new Date(r.deadline).toLocaleDateString() : '—' },
    { key: 'description', label: 'Description', render: r => (r.description || '—').substring(0, 50) },
    { key: 'targetPrice', label: 'Target Price', render: r => r.targetPrice ? `${r.targetPriceCurrency} ${r.targetPrice}` : '—' },
    { key: 'estimatedQty', label: 'Est. Qty', render: r => r.estimatedQtyMin ? `${r.estimatedQtyMin?.toLocaleString()} - ${r.estimatedQtyMax?.toLocaleString()}` : '—' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Development Requests (SRS)" subtitle="Manage customer development requests" action={{ href: '/dashboard/srs/new', label: '+ New SRS' }} />

      <div className="flex gap-2 mb-4">
        {['', 'RECEIVED', 'UNDER_REVIEW', 'COSTING_IN_PROGRESS', 'QUOTED', 'CUSTOMER_CONFIRMED', 'DEVELOPMENT_STARTED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={srsList} linkPrefix="/dashboard/srs" />}
    </div>
  );
}
