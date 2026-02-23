// src/app/(dashboard)/dashboard/srs/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'COSTING_IN_PROGRESS', label: 'Costing' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'CUSTOMER_CONFIRMED', label: 'Confirmed' },
  { value: 'DEVELOPMENT_STARTED', label: 'In Dev' },
  { value: 'SAMPLE_SENT', label: 'Sample Sent' },
  { value: 'ORDER_RECEIVED', label: 'Order Received' },
];

export default function SRSListPage() {
  const [srsList, setSrsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    fetch(`/api/srs?${params}`)
      .then(r => r.json())
      .then(d => setSrsList(d.srsList || []))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  const columns = [
    {
      key: 'thumb',
      label: '',
      width: '60px',
      isLink: true,
      render: r => {
        const url = Array.isArray(r.imageUrls) && r.imageUrls.length > 0 ? r.imageUrls[0] : null;
        return (
          <div className="py-0.5">
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shadow-sm flex-shrink-0">
              {url
                ? <img src={url} alt="" className="w-full h-full object-contain" />
                : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📷</div>
              }
            </div>
          </div>
        );
      }
    },
    { key: 'customer', label: 'Customer', render: r => <span className="font-medium text-gray-800">{r.customer?.name || '—'}</span> },
    { key: 'styleNo', label: 'Style #', render: r => r.styleNo || '—' },
    { key: 'brand', label: 'Brand', render: r => r.brand || '—' },
    { key: 'colorPrint', label: 'Color / Print', render: r => r.colorPrint || '—' },
    { key: 'deadline', label: 'Deadline', render: r => formatDate(r.deadline) },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: r => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Development Requests"
        subtitle="Manage customer development requests"
        action={{ href: '/dashboard/srs/new', label: '+ New SRS' }}
      />

      {/* Search + Status filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          className="input-field max-w-xs"
          placeholder="Search by style#, customer, color…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading
        ? <div className="text-center py-12 text-gray-400">Loading…</div>
        : <DataTable columns={columns} data={srsList} linkPrefix="/dashboard/srs" />
      }
    </div>
  );
}
