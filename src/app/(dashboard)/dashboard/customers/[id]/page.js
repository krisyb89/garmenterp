// src/app/(dashboard)/dashboard/customers/[id]/page.js
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(data => { setCustomer(data); setForm(data); })
      .finally(() => setLoading(false));
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(setCurrentUser)
      .catch(() => {});
  }, [id]);

  const isAdmin = currentUser?.role === 'ADMIN';

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        code: form.code,
        contactPerson: form.contactPerson || null,
        email: form.email || null,
        phone: form.phone || null,
        country: form.country || null,
        address: form.address || null,
        currency: form.currency,
        paymentTermDays: parseInt(form.paymentTermDays) || 60,
        paymentTermBasis: form.paymentTermBasis,
        notes: form.notes || null,
      };
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        return;
      }
      const updated = await res.json();
      setCustomer({ ...customer, ...updated });
      setEditing(false);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
        setDeleting(false);
        return;
      }
      router.push('/dashboard/customers');
    } catch {
      setError('Failed to delete customer');
      setDeleting(false);
    }
  }

  function startEdit() {
    setForm({ ...customer });
    setEditing(true);
    setError('');
  }

  function cancelEdit() {
    setForm({ ...customer });
    setEditing(false);
    setError('');
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!customer) return <div className="text-center py-20 text-red-500">Customer not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/customers" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Customers</Link>
          <h1 className="text-2xl font-bold">{customer.name} ({customer.code})</h1>
        </div>
        {isAdmin && !editing && (
          <div className="flex gap-2">
            <button onClick={startEdit} className="btn-primary text-sm">Edit</button>
            <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 font-medium mb-3">Are you sure you want to delete "{customer.name}"? This will deactivate the customer.</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {editing ? (
        /* Edit Form */
        <div className="card max-w-3xl space-y-4">
          <h2 className="font-semibold mb-2">Edit Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Customer Name *</label>
              <input className="input-field" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Code *</label>
              <input className="input-field" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} required maxLength={10} style={{ textTransform: 'uppercase' }} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Contact Person</label>
              <input className="input-field" value={form.contactPerson || ''} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input className="input-field" type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Phone</label>
              <input className="input-field" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Country</label>
              <input className="input-field" value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label-field">Address</label>
            <textarea className="input-field" rows={2} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Currency</label>
              <select className="select-field" value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="HKD">HKD</option>
                <option value="CNY">CNY</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div>
              <label className="label-field">Payment Terms (days)</label>
              <input className="input-field" type="number" value={form.paymentTermDays || 60} onChange={e => setForm({ ...form, paymentTermDays: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Terms Basis</label>
              <select className="select-field" value={form.paymentTermBasis || 'ROG'} onChange={e => setForm({ ...form, paymentTermBasis: e.target.value })}>
                <option value="ROG">ROG (Receipt of Goods)</option>
                <option value="BL_DATE">B/L Date</option>
                <option value="INVOICE_DATE">Invoice Date</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-field">Notes</label>
            <textarea className="input-field" rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={cancelEdit} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <td>{po.currency} {parseFloat(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td><StatusBadge status={po.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
