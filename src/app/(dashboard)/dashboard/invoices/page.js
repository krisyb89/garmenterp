// src/app/(dashboard)/dashboard/invoices/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/invoices?${params}`).then(r => r.json()).then(d => setInvoices(d.invoices || [])).finally(() => setLoading(false));
  }, [statusFilter]);

  const columns = [
    { key: 'invoiceNo', label: 'Invoice#', isLink: true },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name },
    { key: 'po', label: 'PO#', render: r => r.po?.poNo },
    { key: 'invoiceDate', label: 'Date', render: r => new Date(r.invoiceDate).toLocaleDateString() },
    { key: 'totalAmount', label: 'Total', render: r => `${r.currency} ${parseFloat(r.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { key: 'amountPaid', label: 'Paid', render: r => `${r.currency} ${parseFloat(r.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { key: 'amountDue', label: 'Due', render: r => `${r.currency} ${parseFloat(r.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { key: 'dueDate', label: 'Due Date', render: r => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Customer Invoices" subtitle="Manage invoicing and accounts receivable" />
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'DRAFT', 'SENT', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={invoices} linkPrefix="/dashboard/invoices" />}
    </div>
  );
}
