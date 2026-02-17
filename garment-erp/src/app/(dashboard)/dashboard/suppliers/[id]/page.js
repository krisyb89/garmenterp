// src/app/(dashboard)/dashboard/suppliers/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`/api/suppliers/${id}`).then(r => r.json()).then(setSupplier).finally(() => setLoading(false)); }, [id]);
  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!supplier) return <div className="text-center py-20 text-red-500">Not found</div>;
  return (
    <div>
      <Link href="/dashboard/suppliers" className="text-sm text-blue-600 mb-2 inline-block">← Suppliers</Link>
      <h1 className="text-2xl font-bold mb-1">{supplier.name} ({supplier.code})</h1>
      <p className="text-gray-500 text-sm mb-6">{supplier.type?.replace(/_/g, ' ')} • {supplier.country || '—'}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd>{supplier.contactPerson || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{supplier.email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{supplier.phone || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Currency</dt><dd>{supplier.currency}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Lead Time</dt><dd>{supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Payment Terms</dt><dd>{supplier.paymentTerms || '—'}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Recent Supplier POs</h2>
          {supplier.supplierPOs?.length === 0 ? <p className="text-sm text-gray-400">No POs</p> :
            <div className="space-y-2">{supplier.supplierPOs?.slice(0, 10).map(spo => (
              <div key={spo.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span className="font-medium">{spo.spoNo}</span>
                <div className="flex gap-2 items-center">
                  <span>{spo.currency} {parseFloat(spo.totalAmount).toLocaleString()}</span>
                  <StatusBadge status={spo.status} />
                </div>
              </div>
            ))}</div>}
        </div>
      </div>
    </div>
  );
}
