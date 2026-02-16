// src/app/(dashboard)/dashboard/materials/page.js
'use client';
import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    fetch(`/api/materials?${p}`).then(r => r.json()).then(d => setMaterials(d.materials || [])).finally(() => setLoading(false));
  }, [search]);

  const columns = [
    { key: 'code', label: 'Code', isLink: true, render: r => r.code },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'composition', label: 'Composition' },
    { key: 'weight', label: 'Weight' },
    { key: 'unitOfMeasure', label: 'UOM' },
    { key: 'suppliers', label: 'Suppliers', render: r => r.suppliers?.map(s => s.supplier?.name).join(', ') || '—' },
  ];

  return (
    <div>
      <PageHeader title="Materials" subtitle="Fabric, trim, and material catalog" action={{ href: '/dashboard/materials/new', label: '+ New Material' }} />
      <div className="mb-4"><input type="text" className="input-field max-w-sm" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={materials} linkPrefix="/dashboard/materials" />}
    </div>
  );
}
