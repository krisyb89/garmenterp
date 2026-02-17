// src/app/(dashboard)/dashboard/samples/new/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';

const STAGES = ['PROTO', 'FIT', 'PP', 'TOP', 'SHIPMENT', 'GPT', 'AD_HOC'];

export default function NewSamplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preStyleId = searchParams.get('styleId') || '';
  const [styles, setStyles] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/styles').then(r => r.json()).then(d => setStyles(d.styles || [])); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = {
      styleId: fd.get('styleId'),
      stage: fd.get('stage'),
      size: fd.get('size'),
      fabricUsed: fd.get('fabricUsed'),
      trimUsed: fd.get('trimUsed'),
      dateSent: fd.get('dateSent'),
      courierName: fd.get('courierName'),
      trackingNo: fd.get('trackingNo'),
      internalNotes: fd.get('internalNotes'),
      imageUrls: images,
    };
    try {
      const res = await fetch('/api/samples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { setError((await res.json()).error); return; }
      router.push('/dashboard/samples');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Sample" />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Style *</label>
            <select name="styleId" className="select-field" required defaultValue={preStyleId}>
              <option value="">Select style...</option>
              {styles.map(s => <option key={s.id} value={s.id}>{s.styleNo} — {s.customer?.name || ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Stage *</label>
            <select name="stage" className="select-field" required>
              {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Size(s)</label><input name="size" className="input-field" placeholder="e.g., M" /></div>
          <div><label className="label-field">Fabric Used</label><input name="fabricUsed" className="input-field" /></div>
          <div><label className="label-field">Trim Used</label><input name="trimUsed" className="input-field" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="label-field">Date Sent</label><input name="dateSent" type="date" className="input-field" /></div>
          <div><label className="label-field">Courier</label><input name="courierName" className="input-field" /></div>
          <div><label className="label-field">Tracking #</label><input name="trackingNo" className="input-field" /></div>
        </div>
        <div><label className="label-field">Internal Notes</label><textarea name="internalNotes" className="input-field" rows={2} /></div>
        <div>
          <label className="label-field">Sample Photos</label>
          <ImageUploader images={images} onChange={setImages} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Sample'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
