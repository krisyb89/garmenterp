// src/app/(dashboard)/dashboard/payments/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => setInvoices(d.invoices || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  const outstanding = invoices.filter(i => parseFloat(i.amountDue) > 0);
  const totalDue = outstanding.reduce((s, i) => s + parseFloat(i.amountDue), 0);
  const overdue = outstanding.filter(i => i.dueDate && new Date(i.dueDate) < new Date());
  const totalOverdue = overdue.reduce((s, i) => s + parseFloat(i.amountDue), 0);

  return (
    <div>
      <PageHeader title="Payments & Accounts Receivable" subtitle="Track outstanding and overdue payments" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card text-center"><div className="text-xs text-gray-500">Total Invoices</div><div className="text-xl font-bold">{invoices.length}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Outstanding</div><div className="text-xl font-bold text-orange-600">{outstanding.length}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Total Due</div><div className="text-xl font-bold text-red-600">${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Overdue Amount</div><div className="text-xl font-bold text-red-700">${totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead><tr><th>Invoice#</th><th>Customer</th><th>Total</th><th>Paid</th><th>Due</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>
            {outstanding.map(inv => (
              <tr key={inv.id}>
                <td><Link href={`/dashboard/invoices/${inv.id}`} className="text-blue-600 font-medium">{inv.invoiceNo}</Link></td>
                <td>{inv.customer?.name}</td>
                <td>{inv.currency} {parseFloat(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="text-green-600">{inv.currency} {parseFloat(inv.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="font-bold text-red-600">{inv.currency} {parseFloat(inv.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className={inv.dueDate && new Date(inv.dueDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'TBD'}
                </td>
                <td><StatusBadge status={inv.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {outstanding.length === 0 && <p className="text-center py-8 text-gray-400">No outstanding invoices</p>}
      </div>
    </div>
  );
}
