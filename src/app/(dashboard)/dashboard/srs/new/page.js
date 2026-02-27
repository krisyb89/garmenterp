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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.customers || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.deadline = data.deadline ? new Date(data.deadline).toISOString() : null;
    data.targetPrice = data.targetPrice ? parseFloat(data.targetPrice) : null;
    data.estimatedQtyMin = data.estimatedQtyMin ? parseInt(data.estimatedQtyMin) : null;
    data.estimatedQtyMax = data.estimatedQtyMax ? parseInt(data.estimatedQtyMax) : null;
    // Attach uploaded files
    data.imageUrls = imageUrls;
    data.attachments = attachments;

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

        {/* ── Style Images ── */}
        <div className="pb-2">
          <label className="label-field text-base font-semibold text-gray-700 mb-2 block">
            📷 Style Photos
          </label>
          <p className="text-xs text-gray-400 mb-3">Upload design sketches, reference photos, or style images (max 10)</p>
          <ImageUploader images={imageUrls} onChange={setImageUrls} maxImages={10} />
        </div>

        <div className="border-t pt-4">
          <label className="label-field">Customer *</label>
          <select name="customerId" className="select-field" required>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Style # *</label>
            <input name="styleNo" className="input-field" required placeholder="e.g., ST-10293" />
            <p className="text-xs text-gray-400 mt-1">Style # can repeat across SRS (different colors/prints/timing).</p>
          </div>
          <div>
            <label className="label-field">Brand (optional)</label>
            <input name="brand" className="input-field" placeholder="e.g., Mainline / Kids / Outlet" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Color / Print</label>
            <input name="colorPrint" className="input-field" placeholder="e.g., Navy + floral print" />
          </div>
          <div>
            <label className="label-field">Deadline</label>
            <input name="deadline" type="date" className="input-field" />
          </div>
        </div>

        <div>
          <label className="label-field">Description</label>
          <textarea name="description" className="input-field" rows={3} placeholder="Style description, construction details..." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Estimated Qty (Min)</label>
            <input name="estimatedQtyMin" type="number" className="input-field" placeholder="1000" />
          </div>
          <div>
            <label className="label-field">Estimated Qty (Max)</label>
            <input name="estimatedQtyMax" type="number" className="input-field" placeholder="5000" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Delivery Window</label>
            <input name="deliveryWindow" className="input-field" placeholder="e.g., March 2025" />
          </div>
          <div>
            <label className="label-field">Target Markets</label>
            <input name="targetMarkets" className="input-field" placeholder="e.g., US, EU" />
          </div>
        </div>

        <div>
          <label className="label-field">Fabric Specifications</label>
          <textarea name="fabricSpecs" className="input-field" rows={2} placeholder="Composition, weight, construction..." />
        </div>

        <div>
          <label className="label-field">Trim Specifications</label>
          <textarea name="trimSpecs" className="input-field" rows={2} placeholder="Buttons, zippers, labels..." />
        </div>

        <div>
          <label className="label-field">Notes</label>
          <textarea name="notes" className="input-field" rows={2} />
        </div>

        {/* ── Attachments ── */}
        <div className="border-t pt-4">
          <label className="label-field text-base font-semibold text-gray-700 mb-2 block">
            📎 Attachments
          </label>
          <p className="text-xs text-gray-400 mb-3">Attach tech packs, spec sheets, PDFs, or other documents</p>
          <FileUploader files={attachments} onChange={setAttachments} maxFiles={20} />
        </div>

        <div className="flex gap-3 pt-2 border-t">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create SRS'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
