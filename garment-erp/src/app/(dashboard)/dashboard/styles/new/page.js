// src/app/(dashboard)/dashboard/styles/new/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';

export default function NewStylePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.customers || [])); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);
    data.imageUrls = images;
    try {
      const res = await fetch('/api/styles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/styles');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Style" />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-field">Style# *</label><input name="styleNo" className="input-field" required /></div>
          <div><label className="label-field">Customer *</label>
            <select name="customerId" className="select-field" required>
              <option value="">Select...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-field">Customer Ref</label><input name="customerRef" className="input-field" /></div>
          <div><label className="label-field">Category</label>
            <select name="category" className="select-field">
              <option value="">Select...</option>
              {['Tops','Bottoms','Dresses','Outerwear','Activewear','Underwear','Swimwear','Accessories'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Season</label><input name="season" className="input-field" placeholder="e.g., SS26" /></div>
          <div><label className="label-field">Construction</label>
            <select name="construction" className="select-field">
              <option value="">Select...</option>
              {['Woven','Knit','Denim','Leather','Mixed'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label-field">Fit Type</label>
            <select name="fitType" className="select-field">
              <option value="">Select...</option>
              {['Slim','Regular','Relaxed','Oversized'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div><label className="label-field">Description</label><textarea name="description" className="input-field" rows={2} /></div>

        <div>
          <label className="label-field">Style Images</label>
          <ImageUploader images={images} onChange={setImages} />
        </div>

        <div><label className="label-field">Wash Instructions</label><textarea name="washInstructions" className="input-field" rows={2} /></div>
        <div><label className="label-field">Notes</label><textarea name="notes" className="input-field" rows={2} /></div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Style'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
