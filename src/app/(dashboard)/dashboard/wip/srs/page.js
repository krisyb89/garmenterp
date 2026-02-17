// src/app/(dashboard)/dashboard/wip/srs/page.js
'use client';

import PageHeader from '@/components/PageHeader';
import EditableWIPTable from '@/components/EditableWIPTable';

export default function SRSWIPPage() {
  const baseColumns = [
    { key: 'srsNo', label: 'SRS#', render: r => r.srsNo },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name || '—' },
    { key: 'brand', label: 'Brand', render: r => r.brand || '—' },
    { key: 'styleNo', label: 'Style #', render: r => r.styleNo },
    { key: 'colorPrint', label: 'Color / Print', render: r => r.colorPrint || '—' },
    { key: 'deadline', label: 'Deadline', render: r => r.deadline ? new Date(r.deadline).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: r => r.status?.replace(/_/g, ' ') },
  ];

  return (
    <div>
      <PageHeader title="SRS WIP" subtitle="Excel-like WIP report for all development requests" />
      <EditableWIPTable
        scope="SRS"
        fetchUrl="/api/wip/srs"
        updateRow={(id, wipData) => fetch(`/api/wip/srs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wipData }) })}
        baseColumns={baseColumns}
      />
    </div>
  );
}
