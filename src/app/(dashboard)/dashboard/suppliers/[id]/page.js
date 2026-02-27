// src/app/(dashboard)/dashboard/suppliers/[id]/page.js
'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const SUPPLIER_TYPES = ['FABRIC_MILL', 'TRIM_SUPPLIER', 'CMT_FACTORY', 'WASHING_PLANT', 'PRINT_EMBROIDERY', 'PACKAGING', 'OTHER'];
const CURRENCIES = ['CNY', 'USD', 'VND', 'BDT', 'EUR'];

export default function SupplierDetailPage() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/suppliers/${id}`)
      .then(r => r.json())
      .then(data => {
        setSupplier(data);
        setForm({
          name: data.name || '',
          code: data.code || '',
          type: data.type || 'OTHER',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          country: data.country || '',
          currency: data.currency || 'CNY',
          paymentTerms: data.paymentTerms || '',
          leadTimeDays: data.leadTimeDays ?? '',
          complianceStatus: data.complianceStatus || '',
          rating: data.rating ?? '',
          notes: data.notes || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const data = { ...form };
      if (data.leadTimeDays !== '') data.leadTimeDays = parseInt(data.leadTimeDays);
      else data.leadTimeDays = null;
      if (data.rating !== '') data.rating = parseFloat(data.rating);
      else data.rating = null;

      const res = await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setSupplier(prev => ({ ...prev, ...updated }));
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!supplier) return <div className="text-center py-20 text-red-500">Not found</div>;

  return (
    <div>
      <Link href="/dashboard/suppliers" className="text-sm text-blue-600 mb-2 inline-block">&larr; Suppliers</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">{supplier.name} ({supplier.code})</h1>
          <p className="text-gray-500 text-sm">{supplier.type?.replace(/_/g, ' ')} &bull; {supplier.country || '—'}</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-primary">Edit Supplier</button>
        )}
      </div>

      {editing ? (
        <div className="card">
          <h2 className="font-semibold mb-4">Edit Supplier</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Code</label>
              <input className="input-field" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input-field" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input className="input-field" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input-field" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Lead Time (days)</label>
              <input type="number" className="input-field" value={form.leadTimeDays} onChange={e => setForm({ ...form, leadTimeDays: e.target.value })} />
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <input className="input-field" placeholder="e.g. 30% deposit, 70% before ship" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} />
            </div>
            <div>
              <label className="label">Compliance Status</label>
              <input className="input-field" placeholder="e.g. Audited, Pending" value={form.complianceStatus} onChange={e => setForm({ ...form, complianceStatus: e.target.value })} />
            </div>
            <div>
              <label className="label">Rating (1-5)</label>
              <input type="number" step="0.1" min="1" max="5" className="input-field" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Address</label>
              <textarea className="input-field" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd>{supplier.contactPerson || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{supplier.email || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{supplier.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd className="text-right max-w-xs">{supplier.address || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Currency</dt><dd>{supplier.currency}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Lead Time</dt><dd>{supplier.leadTimeDays ? `${supplier.leadTimeDays} days` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Payment Terms</dt><dd>{supplier.paymentTerms || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Compliance</dt><dd>{supplier.complianceStatus || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Rating</dt><dd>{supplier.rating ? `${parseFloat(supplier.rating).toFixed(1)} / 5` : '—'}</dd></div>
            </dl>
            {supplier.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t">{supplier.notes}</p>}
          </div>

          {/* Materials supplied */}
          {supplier.materials?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-3">Materials Supplied ({supplier.materials.length})</h2>
              <div className="space-y-2">
                {supplier.materials.map(ms => (
                  <div key={ms.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                    <Link href={`/dashboard/materials/${ms.material?.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {ms.material?.code} — {ms.material?.name}
                    </Link>
                    <span>{ms.currency} {parseFloat(ms.unitPrice).toFixed(2)} {ms.isPreferred ? '(Preferred)' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card lg:col-span-2">
            <h2 className="font-semibold mb-3">Recent Supplier POs</h2>
            {supplier.supplierPOs?.length === 0 ? <p className="text-sm text-gray-400">No POs</p> :
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>SPO #</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {supplier.supplierPOs?.slice(0, 10).map(spo => (
                      <tr key={spo.id}>
                        <td>
                          <Link href={`/dashboard/supplier-pos/${spo.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {spo.spoNo}
                          </Link>
                        </td>
                        <td>{new Date(spo.orderDate || spo.createdAt).toLocaleDateString()}</td>
                        <td>{spo.currency} {parseFloat(spo.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td><StatusBadge status={spo.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
