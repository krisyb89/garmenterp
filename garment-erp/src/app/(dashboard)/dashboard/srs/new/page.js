// src/app/(dashboard)/dashboard/srs/new/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';
import FileUploader from '@/components/FileUploader';

export default function NewSRSPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.customers || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.targetPrice = data.targetPrice ? parseFloat(data.targetPrice) : null;
    data.estimatedQtyMin = data.estimatedQtyMin ? parseInt(data.estimatedQtyMin) : null;
    data.estimatedQtyMax = data.estimatedQtyMax ? parseInt(data.estimatedQtyMax) : null;
    data.imageUrls = images;
    data.attachments = files;

    try {
      const res = await fetch('/api/srs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/srs');
    } catch { setError('Failed to create SRS'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Development Request (SRS)" />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div>
          <label className="label-field">Customer *</label>
          <select name="customerId" className="select-field" required>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>

        <div>
          <label className="label-field">Description</label>
          <textarea name="description" className="input-field" rows={3} placeholder="Style description, construction details..." />
        </div>

        <div>
          <label className="label-field">Reference Images</label>
          <ImageUploader images={images} onChange={setImages} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Target Price</label>
            <input name="targetPrice" type="number" step="0.01" className="input-field" placeholder="0.00" />
          </div>
          <div>
            <label className="label-field">Currency</label>
            <select name="targetPriceCurrency" className="select-field" defaultValue="USD">
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Estimated Qty (Min)</label>
            <input name="estimatedQtyMin" type="number" className="input-field" placeholder="1000" />
          </div>
          <div>
            <label className="label-field">Estimated Qty (Max)</label>
            <input name="estimatedQtyMax" type="number" className="input-field" placeholder="5000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Delivery Window</label>
            <input name="deliveryWindow" className="input-field" placeholder="e.g., March 2025" />
          </div>
          <div>
            <label className="label-field">Target Markets</label>
            <input name="targetMarkets" className="input-field" placeholder="e.g., US, EU" />
          </div>
        </div>

        <div><label className="label-field">Fabric Specs</label><textarea name="fabricSpecs" className="input-field" rows={2} /></div>
        <div><label className="label-field">Trim Specs</label><textarea name="trimSpecs" className="input-field" rows={2} /></div>

        <div>
          <label className="label-field">Attachments (tech packs, specs, reference docs)</label>
          <FileUploader files={files} onChange={setFiles} />
        </div>

        <div><label className="label-field">Notes</label><textarea name="notes" className="input-field" rows={2} /></div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create SRS'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
