// src/app/(dashboard)/dashboard/suppliers/page.js
'use client';
import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (typeFilter) p.set('type', typeFilter);
    fetch(`/api/suppliers?${p}`).then(r => r.json()).then(d => setSuppliers(d.suppliers || [])).finally(() => setLoading(false));
  }, [search, typeFilter]);

  const types = ['', 'FABRIC_MILL', 'TRIM_SUPPLIER', 'CMT_FACTORY', 'WASHING_PLANT', 'PRINT_EMBROIDERY', 'PACKAGING'];
  const columns = [
    { key: 'code', label: 'Code', isLink: true },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type', render: r => r.type?.replace(/_/g, ' ') },
    { key: 'country', label: 'Country' },
    { key: 'currency', label: 'Currency' },
    { key: 'leadTimeDays', label: 'Lead Time', render: r => r.leadTimeDays ? `${r.leadTimeDays} days` : '—' },
    { key: 'spos', label: 'POs', render: r => r._count?.supplierPOs || 0 },
  ];

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage suppliers and vendors" action={{ href: '/dashboard/suppliers/new', label: '+ New Supplier' }} />
      <div className="flex gap-4 mb-4">
        <input type="text" className="input-field max-w-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select-field w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {types.map(t => <option key={t} value={t}>{t ? t.replace(/_/g, ' ') : 'All Types'}</option>)}
        </select>
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={suppliers} linkPrefix="/dashboard/suppliers" />}
    </div>
  );
}
