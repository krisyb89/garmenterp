// src/app/(dashboard)/dashboard/packages/new/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

const COURIERS = ['UPS', 'FEDEX', 'DHL', 'HAND_CARRY', 'OTHER'];

export default function NewPackagePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: '', courier: '', trackingNo: '', dateSent: '', inHandDate: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.customers || []));
  }, []);

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.customerId) { setError('Please select a customer'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setError((await res.json()).error || 'Failed'); return; }
      const pkg = await res.json();
      router.push(`/dashboard/packages/${pkg.id}`);
    } catch { setError('Failed to create package'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Package" subtitle="Create a new approval package" />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="card max-w-xl space-y-4">
        <div>
          <label className="label-field">Customer *</label>
          <select className="select-field w-full" value={form.customerId}
            onChange={e => set('customerId', e.target.value)} required>
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Courier</label>
            <select className="select-field w-full" value={form.courier}
              onChange={e => set('courier', e.target.value)}>
              <option value="">— Optional —</option>
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Tracking #</label>
            <input className="input-field w-full" value={form.trackingNo}
              placeholder="Optional" onChange={e => set('trackingNo', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Date Sent</label>
            <input type="date" className="input-field w-full" value={form.dateSent}
              onChange={e => set('dateSent', e.target.value)} />
          </div>
          <div>
            <label className="label-field">In-Hand Date</label>
            <input type="date" className="input-field w-full" value={form.inHandDate}
              onChange={e => set('inHandDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label-field">Notes</label>
          <textarea className="input-field w-full" rows={2} value={form.notes}
            onChange={e => set('notes', e.target.value)} />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Package'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
