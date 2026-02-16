// src/app/(dashboard)/dashboard/factories/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

export default function FactoriesPage() {
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/factories').then(r => r.json()).then(d => setFactories(d.factories || [])).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Factory Name' },
    { key: 'country', label: 'Country' },
    { key: 'type', label: 'Type', render: r => r.isInHouse ? '🏠 In-House' : '🏭 External' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'specialties', label: 'Specialties' },
    { key: 'orders', label: 'Prod Orders', render: r => r._count?.productionOrders || 0 },
  ];

  return (
    <div>
      <PageHeader title="Factories" subtitle="In-house and external manufacturing" action={{ href: '/dashboard/factories/new', label: '+ New Factory' }} />
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={factories} emptyMessage="No factories yet. Add your first factory." />}
    </div>
  );
}
