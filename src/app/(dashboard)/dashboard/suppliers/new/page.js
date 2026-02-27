// src/app/(dashboard)/dashboard/suppliers/new/page.js
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.leadTimeDays = data.leadTimeDays ? parseInt(data.leadTimeDays) : null;
    try {
      const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/suppliers');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Supplier" />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Name *</label><input name="name" className="input-field" required /></div>
          <div><label className="label-field">Code *</label><input name="code" className="input-field" required maxLength={10} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Type *</label>
            <select name="type" className="select-field" required>
              <option value="">Select...</option>
              {['FABRIC_MILL','TRIM_SUPPLIER','CMT_FACTORY','WASHING_PLANT','PRINT_EMBROIDERY','PACKAGING','OTHER'].map(t =>
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label className="label-field">Country</label><input name="country" className="input-field" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Contact Person</label><input name="contactPerson" className="input-field" /></div>
          <div><label className="label-field">Email</label><input name="email" type="email" className="input-field" /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="label-field">Phone</label><input name="phone" className="input-field" /></div>
          <div><label className="label-field">Currency</label>
            <select name="currency" className="select-field" defaultValue="CNY">
              <option value="CNY">CNY</option><option value="USD">USD</option><option value="VND">VND</option><option value="BDT">BDT</option><option value="EUR">EUR</option>
            </select>
          </div>
          <div><label className="label-field">Lead Time (days)</label><input name="leadTimeDays" type="number" className="input-field" /></div>
        </div>
        <div><label className="label-field">Payment Terms</label><input name="paymentTerms" className="input-field" placeholder="e.g., 30% deposit, 70% before ship" /></div>
        <div><label className="label-field">Address</label><textarea name="address" className="input-field" rows={2} /></div>
        <div><label className="label-field">Notes</label><textarea name="notes" className="input-field" rows={2} /></div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Supplier'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
