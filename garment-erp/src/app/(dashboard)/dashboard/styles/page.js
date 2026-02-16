// src/app/(dashboard)/dashboard/styles/page.js
'use client';
import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

export default function StylesPage() {
  const [styles, setStyles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    fetch(`/api/styles?${p}`).then(r => r.json()).then(d => setStyles(d.styles || [])).finally(() => setLoading(false));
  }, [search]);

  const columns = [
    { key: 'styleNo', label: 'Style#', isLink: true },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name },
    { key: 'category', label: 'Category' },
    { key: 'season', label: 'Season' },
    { key: 'construction', label: 'Construction' },
    { key: 'bom', label: 'BOM Items', render: r => r._count?.bomItems || 0 },
    { key: 'samples', label: 'Samples', render: r => r._count?.samples || 0 },
    { key: 'pos', label: 'PO Lines', render: r => r._count?.poLines || 0 },
  ];

  return (
    <div>
      <PageHeader title="Styles" subtitle="Style master catalog" action={{ href: '/dashboard/styles/new', label: '+ New Style' }} />
      <div className="mb-4">
        <input type="text" className="input-field max-w-sm" placeholder="Search styles..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={styles} linkPrefix="/dashboard/styles" />}
    </div>
  );
}
