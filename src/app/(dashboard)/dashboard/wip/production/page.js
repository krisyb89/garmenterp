// src/app/(dashboard)/dashboard/wip/production/page.js
'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ProductionWIPTable from '@/components/ProductionWIPTable';

export default function ProductionWIPPage() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/wip/production'),
        fetch('/api/wip/columns?scope=PRODUCTION'),
      ]);
      const data1 = await r1.json();
      const data2 = await r2.json();
      setRows(data1.rows || []);
      setColumns((data2.columns || []).filter(c => c.isActive));
    } catch (e) {
      console.error(e);
      setRows([]);
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Production WIP" subtitle="PO line items + sample & approval milestones (color-coded)" />
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading Production WIP…</div>
      ) : (
        <ProductionWIPTable rows={rows} columns={columns} onRefresh={load} />
      )}
    </div>
  );
}
