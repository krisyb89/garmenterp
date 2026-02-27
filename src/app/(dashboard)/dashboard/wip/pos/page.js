// src/app/(dashboard)/dashboard/wip/pos/page.js
'use client';

import PageHeader from '@/components/PageHeader';
import EditableWIPTable from '@/components/EditableWIPTable';

export default function POWIPPage() {
  const baseColumns = [
    { key: 'poNo', label: 'PO#', render: r => r.poNo },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name || '—' },
    { key: 'store', label: 'Store', render: r => r.store || '—' },
    { key: 'brand', label: 'Brand', render: r => r.brand || '—' },
    { key: 'ihDate', label: 'IH Date', render: r => r.ihDate ? new Date(r.ihDate).toLocaleDateString() : '—' },
    { key: 'totalQty', label: 'Qty', render: r => (r.totalQty || 0).toLocaleString() },
    { key: 'totalAmount', label: 'Amount', render: r => r.totalAmount != null ? Number(r.totalAmount).toFixed(2) : '—' },
  ];

  return (
    <div>
      <PageHeader title="PO WIP" subtitle="Excel-like WIP report for customer POs" />
      <EditableWIPTable
        scope="PO"
        fetchUrl="/api/wip/pos"
        updateRow={(id, wipData) => fetch(`/api/wip/pos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wipData }) })}
        baseColumns={baseColumns}
      />
    </div>
  );
}
