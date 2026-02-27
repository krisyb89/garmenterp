// src/app/(dashboard)/dashboard/samples/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ImageUploader from '@/components/ImageUploader';

const STATUSES = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'APPROVED_WITH_COMMENTS'];

export default function SampleDetailPage() {
  const { id } = useParams();
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(`/api/samples/${id}`).then(r => r.json()).then(setSample).finally(() => setLoading(false)); }, [id]);

  async function save(updates) {
    setSaving(true);
    const res = await fetch(`/api/samples/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    const data = await res.json();
    setSample(prev => ({ ...prev, ...data }));
    setSaving(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    save({
      dateSent: fd.get('dateSent') || null,
      dateReceived: fd.get('dateReceived') || null,
      courierName: fd.get('courierName'),
      trackingNo: fd.get('trackingNo'),
      size: fd.get('size'),
      fabricUsed: fd.get('fabricUsed'),
      trimUsed: fd.get('trimUsed'),
      customerComments: fd.get('customerComments'),
      internalNotes: fd.get('internalNotes'),
    });
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!sample) return <div className="text-center py-20 text-red-500">Sample not found</div>;

  const fmt = d => d ? new Date(d).toISOString().split('T')[0] : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/samples" className="text-sm text-blue-600 mb-2 inline-block">← Samples</Link>
          <h1 className="text-2xl font-bold">{sample.style?.styleNo} — {sample.stage} Sample</h1>
          <p className="text-gray-500 text-sm">Revision #{sample.revisionNo} • {sample.style?.customer?.name} • Created by {sample.createdBy?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={sample.status} />
          <select className="select-field w-auto text-sm" value={sample.status} onChange={e => save({ status: e.target.value })} disabled={saving}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2 mb-6">
        {sample.status === 'PENDING' && <button className="btn-primary text-xs" onClick={() => save({ status: 'IN_PROGRESS' })}>Start</button>}
        {sample.status === 'IN_PROGRESS' && <button className="btn-primary text-xs" onClick={() => save({ status: 'SUBMITTED', dateSent: new Date().toISOString() })}>Mark Submitted</button>}
        {sample.status === 'SUBMITTED' && (
          <>
            <button className="btn-success text-xs" onClick={() => save({ status: 'APPROVED', dateReceived: new Date().toISOString() })}>Approve</button>
            <button className="btn-danger text-xs" onClick={() => save({ status: 'REJECTED', dateReceived: new Date().toISOString() })}>Reject</button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Edit form */}
        <form onSubmit={handleSave} className="card lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="label-field">Size(s)</label><input name="size" className="input-field" defaultValue={sample.size || ''} /></div>
            <div><label className="label-field">Fabric Used</label><input name="fabricUsed" className="input-field" defaultValue={sample.fabricUsed || ''} /></div>
            <div><label className="label-field">Trim Used</label><input name="trimUsed" className="input-field" defaultValue={sample.trimUsed || ''} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Date Sent</label><input name="dateSent" type="date" className="input-field" defaultValue={fmt(sample.dateSent)} /></div>
            <div><label className="label-field">Date Received</label><input name="dateReceived" type="date" className="input-field" defaultValue={fmt(sample.dateReceived)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label-field">Courier</label><input name="courierName" className="input-field" defaultValue={sample.courierName || ''} /></div>
            <div><label className="label-field">Tracking #</label><input name="trackingNo" className="input-field" defaultValue={sample.trackingNo || ''} /></div>
          </div>
          <div><label className="label-field">Customer Comments</label><textarea name="customerComments" className="input-field" rows={2} defaultValue={sample.customerComments || ''} /></div>
          <div><label className="label-field">Internal Notes</label><textarea name="internalNotes" className="input-field" rows={2} defaultValue={sample.internalNotes || ''} /></div>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>

        {/* Images */}
        <div className="card">
          <h2 className="font-semibold mb-3">Sample Photos</h2>
          <ImageUploader images={sample.imageUrls || []} onChange={urls => save({ imageUrls: urls })} />
        </div>
      </div>
    </div>
  );
}
