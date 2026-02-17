// src/app/(dashboard)/dashboard/materials/new/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

export default function NewMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch('/api/material-categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => setCategories([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    // Parse numeric fields
    data.moq = data.moq ? parseFloat(data.moq) : null;
    data.leadTimeDays = data.leadTimeDays ? parseInt(data.leadTimeDays) : null;
    data.widthMeters = data.widthMeters ? parseFloat(data.widthMeters) : null;
    data.gsm = data.gsm ? parseInt(data.gsm) : null;
    data.pricePerUnit = data.pricePerUnit ? parseFloat(data.pricePerUnit) : null;
    data.vatPercent = data.vatPercent ? parseFloat(data.vatPercent) : 0;

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
            <select name="categoryId" className="select-field" required>
              <option value="">Select...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Add more types in Materials → Types (API: /api/material-categories)</p>
          </div>
        </div>
        <div><label className="label-field">Description</label><input name="description" className="input-field" /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Content</label><input name="content" className="input-field" placeholder="100% Cotton" /></div>
          <div><label className="label-field">Width (meters)</label><input name="widthMeters" type="number" step="0.0001" className="input-field" placeholder="1.50" /></div>
          <div><label className="label-field">GSM</label><input name="gsm" type="number" className="input-field" placeholder="180" /></div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div><label className="label-field">Price / Unit</label><input name="pricePerUnit" type="number" step="0.0001" className="input-field" placeholder="0" /></div>
          <div><label className="label-field">Unit</label>
            <select name="unit" className="select-field" defaultValue="METER">
              <option value="METER">Meter</option>
              <option value="YARD">Yard</option>
              <option value="KG">KG</option>
              <option value="PCS">PCS</option>
            </select>
          </div>
          <div><label className="label-field">VAT %</label><input name="vatPercent" type="number" step="0.01" className="input-field" defaultValue="13" /></div>
          <div><label className="label-field">Lead Time (days)</label><input name="leadTimeDays" type="number" className="input-field" /></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Legacy UOM (optional)</label>
            <select name="unitOfMeasure" className="select-field" defaultValue="MTR">
              <option value="MTR">MTR</option><option value="YDS">YDS</option><option value="PCS">PCS</option>
              <option value="KG">KG</option><option value="GROSS">GROSS</option>
            </select>
          </div>
          <div><label className="label-field">MOQ</label><input name="moq" type="number" className="input-field" /></div>
          <div><label className="label-field">Notes</label><input name="notes" className="input-field" /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Material'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
