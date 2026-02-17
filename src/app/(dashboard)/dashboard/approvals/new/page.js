// src/app/(dashboard)/dashboard/approvals/new/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ImageUploader from '@/components/ImageUploader';

const TYPES = ['LAB_DIP', 'FABRIC', 'TRIM', 'PRINT_STRIKEOFF', 'EMBROIDERY_STRIKEOFF', 'WASH', 'FIT'];

export default function NewApprovalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preStyleId = searchParams.get('styleId') || '';
  const [styles, setStyles] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/styles').then(r => r.json()).then(d => setStyles(d.styles || []));
    fetch('/api/materials').then(r => r.json()).then(d => setMaterials(d.materials || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = {
      styleId: fd.get('styleId'),
      type: fd.get('type'),
      materialId: fd.get('materialId') || null,
      reference: fd.get('reference'),
      supplierName: fd.get('supplierName'),
      submitDate: fd.get('submitDate'),
      notes: fd.get('notes'),
      imageUrls: images,
    };
    try {
      const res = await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { setError((await res.json()).error); return; }
      router.push('/dashboard/approvals');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader title="New Approval Submission" />
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
            <label className="label-field">Type *</label>
            <select name="type" className="select-field" required>
              {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Material (optional)</label>
            <select name="materialId" className="select-field">
              <option value="">None</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
            </select>
          </div>
          <div><label className="label-field">Supplier Name</label><input name="supplierName" className="input-field" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-field">Reference (Pantone, swatch ref)</label><input name="reference" className="input-field" /></div>
          <div><label className="label-field">Submit Date</label><input name="submitDate" type="date" className="input-field" /></div>
        </div>
        <div><label className="label-field">Notes</label><textarea name="notes" className="input-field" rows={2} /></div>
        <div>
          <label className="label-field">Photos (swatches, strike-offs)</label>
          <ImageUploader images={images} onChange={setImages} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Submit Approval'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
