// src/app/(dashboard)/dashboard/materials/new/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function NewMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.moq = data.moq ? parseFloat(data.moq) : null;
    data.leadTimeDays = data.leadTimeDays ? parseInt(data.leadTimeDays) : null;

    try {
      const res = await fetch('/api/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/materials');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Material" />
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Code *</label><input name="code" className="input-field" required placeholder="FAB-002" /></div>
          <div><label className="label-field">Name *</label><input name="name" className="input-field" required /></div>
          <div><label className="label-field">Type *</label>
            <select name="type" className="select-field" required>
              <option value="">Select...</option>
              <option value="FABRIC">Fabric</option><option value="TRIM">Trim</option><option value="LABEL">Label</option>
              <option value="HANGTAG">Hangtag</option><option value="PACKAGING">Packaging</option>
              <option value="ACCESSORY">Accessory</option><option value="OTHER">Other</option>
            </select>
          </div>
        </div>
        <div><label className="label-field">Description</label><input name="description" className="input-field" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Composition</label><input name="composition" className="input-field" placeholder="100% Cotton" /></div>
          <div><label className="label-field">Weight</label><input name="weight" className="input-field" placeholder="180 GSM" /></div>
          <div><label className="label-field">Width</label><input name="width" className="input-field" placeholder="58 inches" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Unit of Measure</label>
            <select name="unitOfMeasure" className="select-field" defaultValue="YDS">
              <option value="YDS">Yards</option><option value="MTR">Meters</option><option value="PCS">Pieces</option>
              <option value="KG">Kilograms</option><option value="GROSS">Gross</option>
            </select>
          </div>
          <div><label className="label-field">MOQ</label><input name="moq" type="number" className="input-field" /></div>
          <div><label className="label-field">Lead Time (days)</label><input name="leadTimeDays" type="number" className="input-field" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Material'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
