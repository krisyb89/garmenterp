// src/app/(dashboard)/dashboard/factories/new/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function NewFactoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.isInHouse = data.isInHouse === 'true';

    try {
      const res = await fetch('/api/factories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/factories');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Factory" />
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Factory Name *</label><input name="name" className="input-field" required /></div>
          <div><label className="label-field">Code *</label><input name="code" className="input-field" required /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Country *</label><input name="country" className="input-field" required placeholder="e.g., Vietnam" /></div>
          <div><label className="label-field">Type</label>
            <select name="isInHouse" className="select-field"><option value="false">External / Subcontractor</option><option value="true">In-House</option></select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Contact Person</label><input name="contactPerson" className="input-field" /></div>
          <div><label className="label-field">Phone</label><input name="phone" className="input-field" /></div>
        </div>
        <div><label className="label-field">Address</label><textarea name="address" className="input-field" rows={2} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label-field">Capacity</label><input name="capacity" className="input-field" placeholder="e.g., 10000 pcs/month" /></div>
          <div><label className="label-field">Specialties</label><input name="specialties" className="input-field" placeholder="e.g., Knits, Woven shirts" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Factory'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
