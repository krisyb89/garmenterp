// src/app/(dashboard)/dashboard/materials/page.js
'use client';
import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

const TYPE_TABS = [
  { label: 'All',     value: '' },
  { label: 'Fabric',  value: 'FABRIC' },
  { label: 'Trim',    value: 'TRIM' },
  { label: 'Packing', value: 'PACKING' },
];

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (typeFilter) p.set('category', typeFilter);
    fetch(`/api/materials?${p}`)
      .then(r => r.json())
      .then(d => setMaterials(d.materials || []))
      .finally(() => setLoading(false));
  }, [search, typeFilter]);

  const columns = [
    { key: 'code', label: 'Code', isLink: true, render: r => r.code },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Type', render: r => (
      <span className={`status-badge ${
        r.category?.name === 'FABRIC'  ? 'bg-blue-100 text-blue-700' :
        r.category?.name === 'TRIM'    ? 'bg-purple-100 text-purple-700' :
        r.category?.name === 'PACKING' ? 'bg-orange-100 text-orange-700' :
        'bg-gray-100 text-gray-600'
      }`}>{r.category?.name || '—'}</span>
    )},
    { key: 'content', label: 'Content', render: r => r.content || r.composition || '—' },
    { key: 'pricePerUnit', label: 'Price/Unit', render: r => r.pricePerUnit != null ? Number(r.pricePerUnit).toFixed(2) : '—' },
    { key: 'unit', label: 'Unit', render: r => r.unit || '—' },
    { key: 'pricePerMeter', label: 'Price/M', render: r => r.pricePerMeter != null ? Number(r.pricePerMeter).toFixed(4) : '—' },
    { key: 'suppliers', label: 'Suppliers', render: r => r.suppliers?.map(s => s.supplier?.name).join(', ') || '—' },
  ];

  return (
    <div>
      <PageHeader title="Materials" subtitle="Fabric, trim, and packing catalog" action={{ href: '/dashboard/materials/new', label: '+ New Material' }} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          className="input-field max-w-xs"
          placeholder="Search materials…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5">
          {TYPE_TABS.map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t.value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading
        ? <div className="text-center py-12 text-gray-400">Loading…</div>
        : <DataTable columns={columns} data={materials} linkPrefix="/dashboard/materials" />
      }
    </div>
  );
}
