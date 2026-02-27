// src/app/(dashboard)/dashboard/factories/[id]/page.js
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function FactoryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [factory, setFactory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/factories/${id}`)
      .then(r => r.json())
      .then(data => {
        setFactory(data);
        setForm({
          name: data.name || '',
          code: data.code || '',
          country: data.country || '',
          address: data.address || '',
          contactPerson: data.contactPerson || '',
          phone: data.phone || '',
          email: data.email || '',
          isInHouse: data.isInHouse || false,
          capacity: data.capacity || '',
          specialties: data.specialties || '',
          cmtRateRange: data.cmtRateRange || '',
          complianceStatus: data.complianceStatus || '',
          notes: data.notes || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/factories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setFactory({ ...factory, ...updated });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!factory) return <div className="text-center py-20 text-red-500">Factory not found</div>;

  return (
    <div>
      <Link href="/dashboard/factories" className="text-sm text-blue-600 mb-2 inline-block">&larr; Factories</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{factory.name} ({factory.code})</h1>
          <p className="text-gray-500 text-sm">{factory.isInHouse ? 'In-House' : 'External'} &bull; {factory.country || '—'}</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-primary">Edit Factory</button>
        )}
      </div>

      {editing ? (
        <div className="card">
          <h2 className="font-semibold mb-4">Edit Factory</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Code</label>
              <input className="input-field" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input-field" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.isInHouse ? 'true' : 'false'} onChange={e => setForm({ ...form, isInHouse: e.target.value === 'true' })}>
                <option value="false">External / Subcontractor</option>
                <option value="true">In-House</option>
              </select>
            </div>
            <div>
              <label className="label">Contact Person</label>
              <input className="input-field" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">CMT Rate Range</label>
              <input className="input-field" placeholder="e.g. $2.50 - $4.00" value={form.cmtRateRange} onChange={e => setForm({ ...form, cmtRateRange: e.target.value })} />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input className="input-field" placeholder="e.g. 5000 pcs/month" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <label className="label">Specialties</label>
              <input className="input-field" placeholder="e.g. Knits, Woven shirts" value={form.specialties} onChange={e => setForm({ ...form, specialties: e.target.value })} />
            </div>
            <div>
              <label className="label">Compliance Status</label>
              <input className="input-field" placeholder="e.g. Audited, Pending" value={form.complianceStatus} onChange={e => setForm({ ...form, complianceStatus: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <textarea className="input-field" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="md:col-span-2">
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
              <div className="flex justify-between"><dt className="text-gray-500">Contact</dt><dd>{factory.contactPerson || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{factory.phone || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{factory.email || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd className="text-right max-w-xs">{factory.address || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">CMT Rate</dt><dd>{factory.cmtRateRange || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Capacity</dt><dd>{factory.capacity || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Specialties</dt><dd>{factory.specialties || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Compliance</dt><dd>{factory.complianceStatus || '—'}</dd></div>
              {factory.supplier && <div className="flex justify-between"><dt className="text-gray-500">Linked Supplier</dt><dd>{factory.supplier.name} ({factory.supplier.code})</dd></div>}
            </dl>
            {factory.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t">{factory.notes}</p>}
          </div>

          <div className="card">
            <h2 className="font-semibold mb-3">Production Orders ({factory.productionOrders?.length || 0})</h2>
            {!factory.productionOrders?.length ? (
              <p className="text-sm text-gray-400">No production orders</p>
            ) : (
              <div className="space-y-2">
                {factory.productionOrders.map(po => (
                  <Link key={po.id} href={`/dashboard/production/${po.id}`} className="flex justify-between text-sm py-1.5 border-b border-gray-50 hover:bg-gray-50 -mx-1 px-1 rounded">
                    <div>
                      <span className="font-medium">{po.prodOrderNo}</span>
                      <span className="text-gray-400 ml-2">{po.styleNo} {po.color ? `- ${po.color}` : ''}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="text-gray-500">{po.po?.customer?.name}</span>
                      <StatusBadge status={po.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
