// src/app/(dashboard)/dashboard/customers/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!customer) return <div className="text-center py-20 text-red-500">Customer not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/customers" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Customers</Link>
          <h1 className="text-2xl font-bold">{customer.name} ({customer.code})</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd>{customer.contactPerson || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{customer.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{customer.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Country</dt><dd>{customer.country || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Currency</dt><dd>{customer.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Payment Terms</dt><dd>Net {customer.paymentTermDays} ({customer.paymentTermBasis})</dd></div>
          </dl>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Statistics</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Total POs</dt><dd className="font-medium">{customer._count?.purchaseOrders || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Total SRS</dt><dd className="font-medium">{customer._count?.srsList || 0}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Invoices</dt><dd className="font-medium">{customer._count?.invoices || 0}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Notes</h2>
          <p className="text-sm text-gray-600">{customer.notes || 'No notes'}</p>
        </div>
      </div>

      {/* Recent POs */}
      <div className="card mt-6">
        <h2 className="font-semibold mb-4">Recent Purchase Orders</h2>
        {customer.purchaseOrders?.length === 0 ? (
          <p className="text-sm text-gray-400">No POs yet</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>PO#</th><th>Date</th><th>Qty</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {customer.purchaseOrders?.map(po => (
                <tr key={po.id}>
                  <td><Link href={`/dashboard/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800 font-medium">{po.poNo}</Link></td>
                  <td>{new Date(po.orderDate).toLocaleDateString()}</td>
                  <td>{po.totalQty?.toLocaleString()}</td>
                  <td>{po.currency} {parseFloat(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td><StatusBadge status={po.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
