'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ImageUploader from '@/components/ImageUploader';
import FileUploader from '@/components/FileUploader';

const ALL_STATUSES = [
  'RECEIVED', 'UNDER_REVIEW', 'COSTING_IN_PROGRESS', 'QUOTED',
  'CUSTOMER_CONFIRMED', 'DEVELOPMENT_STARTED', 'SAMPLE_SENT',
  'ORDER_RECEIVED', 'ON_HOLD', 'CANCELLED',
];

function toDateInput(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

export default function SRSDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [srs, setSRS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [stylePromotion, setStylePromotion] = useState(null); // { styleId, styleNo, created }
  const [form, setForm] = useState({});
  const [imageUrls, setImageUrls] = useState([]);
  const [attachments, setAttachments] = useState([]);

  // Inline SRS# editing
  const [editingSrsNo, setEditingSrsNo] = useState(false);
  const [srsNoInput,   setSrsNoInput]   = useState('');
  const [srsNoError,   setSrsNoError]   = useState('');

  async function saveSrsNo() {
    const trimmed = srsNoInput.trim();
    if (!trimmed || trimmed === srs.srsNo) { setEditingSrsNo(false); return; }
    setSrsNoError('');
    const res = await fetch(`/api/srs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ srsNo: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) { setSrsNoError(data.error || 'Failed to update SRS#'); return; }
    setSRS(prev => ({ ...prev, srsNo: trimmed }));
    setEditingSrsNo(false);
  }

  useEffect(() => {
    fetch(`/api/srs/${id}`)
      .then(r => r.json())
      .then(data => {
        setSRS(data);
        setForm({
          styleNo: data.styleNo || '',
          brand: data.brand || '',
          colorPrint: data.colorPrint || '',
          deadline: toDateInput(data.deadline),
          description: data.description || '',
          targetPrice: data.targetPrice ?? '',
          targetPriceCurrency: data.targetPriceCurrency || 'USD',
          estimatedQtyMin: data.estimatedQtyMin ?? '',
          estimatedQtyMax: data.estimatedQtyMax ?? '',
          deliveryWindow: data.deliveryWindow || '',
          targetMarkets: data.targetMarkets || '',
          fabricSpecs: data.fabricSpecs || '',
          trimSpecs: data.trimSpecs || '',
          notes: data.notes || '',
          status: data.status || 'RECEIVED',
        });
        setImageUrls(Array.isArray(data.imageUrls) ? data.imageUrls : []);
        setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function set(key, value) { setForm(prev => ({ ...prev, [key]: value })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      const payload = {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        targetPrice: form.targetPrice !== '' ? parseFloat(form.targetPrice) : null,
        estimatedQtyMin: form.estimatedQtyMin !== '' ? parseInt(form.estimatedQtyMin) : null,
        estimatedQtyMax: form.estimatedQtyMax !== '' ? parseInt(form.estimatedQtyMax) : null,
        imageUrls: imageUrls.length > 0 ? imageUrls : null,
        attachments: attachments.length > 0 ? attachments : null,
      };
      const res = await fetch(`/api/srs/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      setSRS(prev => ({ ...prev, ...data }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      // Style promotion banner
      if (data.style?.id) {
        setStylePromotion({
          styleId: data.style.id,
          styleNo: data.style.styleNo,
          created: !!data._styleCreated,
        });
      }
    } catch { setError('Failed to save'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!srs) return <div className="text-center py-20 text-red-500">SRS not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/srs" className="text-sm text-blue-600 mb-1 inline-block hover:underline">
            ← Development Requests
          </Link>
          {editingSrsNo ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                className="input-field text-xl font-bold w-48"
                value={srsNoInput}
                onChange={e => { setSrsNoInput(e.target.value); setSrsNoError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') saveSrsNo(); if (e.key === 'Escape') setEditingSrsNo(false); }}
                onBlur={saveSrsNo}
                autoFocus
              />
              {srsNoError && <span className="text-xs text-red-500">{srsNoError}</span>}
            </div>
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-blue-700 group flex items-center gap-2"
              title="Click to edit SRS#"
              onClick={() => { setSrsNoInput(srs.srsNo); setEditingSrsNo(true); setSrsNoError(''); }}>
              {srs.srsNo}
              <span className="text-sm text-gray-300 group-hover:text-blue-400 font-normal">✏️</span>
            </h1>
          )}
          <p className="text-gray-500 text-sm">{srs.customer?.name} · Created by {srs.createdBy?.name}</p>
          {srs.style && (
            <Link href={`/dashboard/styles/${srs.style.id}`} className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              📦 Style: {srs.style.styleNo} →
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={form.status} />
          <select className="select-field w-auto text-sm" value={form.status} onChange={e => set('status', e.target.value)}>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Style Photos */}
        <div className="card">
          <h2 className="font-semibold mb-3">📷 Style Photos</h2>
          <ImageUploader images={imageUrls} onChange={setImageUrls} maxImages={10} />
        </div>

        {/* Core Details */}
        <div className="card space-y-4">
          <h2 className="font-semibold">Request Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Style # *</label>
              <input className="input-field" value={form.styleNo} onChange={e => set('styleNo', e.target.value)} required />
            </div>
            <div>
              <label className="label-field">Brand</label>
              <input className="input-field" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g., Mainline / Kids" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Color / Print</label>
              <input className="input-field" value={form.colorPrint} onChange={e => set('colorPrint', e.target.value)} placeholder="e.g., Navy + floral print" />
            </div>
            <div>
              <label className="label-field">Deadline</label>
              <input type="date" className="input-field" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label-field">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Style description, construction details…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Target Price</label>
              <input type="number" step="0.01" className="input-field" value={form.targetPrice} onChange={e => set('targetPrice', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label-field">Currency</label>
              <select className="select-field" value={form.targetPriceCurrency} onChange={e => set('targetPriceCurrency', e.target.value)}>
                <option>USD</option><option>EUR</option><option>GBP</option>
              </select>
            </div>
            <div>
              <label className="label-field">Delivery Window</label>
              <input className="input-field" value={form.deliveryWindow} onChange={e => set('deliveryWindow', e.target.value)} placeholder="e.g., March 2026" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Est. Qty Min</label>
              <input type="number" className="input-field" value={form.estimatedQtyMin} onChange={e => set('estimatedQtyMin', e.target.value)} placeholder="1000" />
            </div>
            <div>
              <label className="label-field">Est. Qty Max</label>
              <input type="number" className="input-field" value={form.estimatedQtyMax} onChange={e => set('estimatedQtyMax', e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label className="label-field">Target Markets</label>
              <input className="input-field" value={form.targetMarkets} onChange={e => set('targetMarkets', e.target.value)} placeholder="e.g., US, EU" />
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="card space-y-4">
          <h2 className="font-semibold">Specifications</h2>
          <div>
            <label className="label-field">Fabric Specifications</label>
            <textarea className="input-field" rows={2} value={form.fabricSpecs} onChange={e => set('fabricSpecs', e.target.value)} placeholder="Composition, weight, construction…" />
          </div>
          <div>
            <label className="label-field">Trim Specifications</label>
            <textarea className="input-field" rows={2} value={form.trimSpecs} onChange={e => set('trimSpecs', e.target.value)} placeholder="Buttons, zippers, labels…" />
          </div>
          <div>
            <label className="label-field">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {/* Attachments */}
        <div className="card">
          <h2 className="font-semibold mb-3">📎 Attachments</h2>
          <FileUploader files={attachments} onChange={setAttachments} maxFiles={20} />
        </div>

        {/* Style promotion banner */}
        {stylePromotion && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-green-800">
              <span className="text-lg">🎉</span>
              <span>
                {stylePromotion.created
                  ? <>Style <strong>{stylePromotion.styleNo}</strong> has been created and added to the Style Library.</>
                  : <>This SRS has been linked to existing style <strong>{stylePromotion.styleNo}</strong>.</>
                }
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/dashboard/styles/${stylePromotion.styleId}`} className="text-sm font-medium text-green-700 hover:text-green-900 underline">
                View Style →
              </Link>
              <button type="button" onClick={() => setStylePromotion(null)} className="text-green-500 hover:text-green-700 text-lg leading-none">×</button>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => router.push('/dashboard/srs')}>
              Cancel
            </button>
            {success && <span className="text-green-600 text-sm font-medium">✓ Saved</span>}
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
          <Link href={`/dashboard/srs/${id}/costing`} className="btn-primary" style={{ backgroundColor: '#4f46e5' }}>
            Open Costing →
          </Link>
        </div>

      </form>
    </div>
  );
}
