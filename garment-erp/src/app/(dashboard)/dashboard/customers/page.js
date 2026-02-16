// src/app/(dashboard)/dashboard/customers/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    fetch(`/api/customers?${params}`)
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []))
      .finally(() => setLoading(false));
  }, [search]);

  const columns = [
    { key: 'code', label: 'Code', isLink: true },
    { key: 'name', label: 'Customer Name' },
    { key: 'country', label: 'Country' },
    { key: 'currency', label: 'Currency' },
    { key: 'paymentTermDays', label: 'Terms', render: r => `Net ${r.paymentTermDays} (${r.paymentTermBasis})` },
    { key: 'orders', label: 'POs', render: r => r._count?.purchaseOrders || 0 },
    { key: 'srs', label: 'SRS', render: r => r._count?.srsList || 0 },
  ];

  return (
    <div>
      <PageHeader title="Customers" subtitle="Manage customer accounts" action={{ href: '/dashboard/customers/new', label: '+ New Customer' }} />
      
      <div className="mb-4">
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <DataTable columns={columns} data={customers} linkPrefix="/dashboard/customers" emptyMessage="No customers found. Create your first customer." />
      )}
    </div>
  );
}
