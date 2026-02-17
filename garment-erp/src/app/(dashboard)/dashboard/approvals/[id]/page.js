// src/app/(dashboard)/dashboard/approvals/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ImageUploader from '@/components/ImageUploader';

const STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMIT', 'APPROVED_WITH_COMMENTS'];

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(`/api/approvals/${id}`).then(r => r.json()).then(setApproval).finally(() => setLoading(false)); }, [id]);

  async function save(updates) {
    setSaving(true);
    const res = await fetch(`/api/approvals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
    const data = await res.json();
    setApproval(prev => ({ ...prev, ...data }));
    setSaving(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    save({
      submitDate: fd.get('submitDate') || null,
      approvalDate: fd.get('approvalDate') || null,
      reference: fd.get('reference'),
      supplierName: fd.get('supplierName'),
      customerComments: fd.get('customerComments'),
      notes: fd.get('notes'),
    });
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!approval) return <div className="text-center py-20 text-red-500">Approval not found</div>;

  const fmt = d => d ? new Date(d).toISOString().split('T')[0] : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/approvals" className="text-sm text-blue-600 mb-2 inline-block">← Approvals</Link>
          <h1 className="text-2xl font-bold">{approval.style?.styleNo} — {approval.type.replace(/_/g, ' ')}</h1>
          <p className="text-gray-500 text-sm">Submission #{approval.submissionNo} • {approval.style?.customer?.name} {approval.material ? `• Material: ${approval.material.name}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={approval.status} />
          <select className="select-field w-auto text-sm" value={approval.status} onChange={e => save({ status: e.target.value })} disabled={saving}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-6">
        {approval.status === 'PENDING' && <button className="btn-primary text-xs" onClick={() => save({ status: 'SUBMITTED', submitDate: new Date().toISOString() })}>Mark Submitted</button>}
        {approval.status === 'SUBMITTED' && (
          <>
            <button className="btn-success text-xs" onClick={() => save({ status: 'APPROVED', approvalDate: new Date().toISOString() })}>Approve</button>
            <button className="btn-danger text-xs" onClick={() => save({ status: 'REJECTED' })}>Reject</button>
            <button className="btn-secondary text-xs" onClick={() => save({ status: 'RESUBMIT' })}>Request Resubmit</button>
          </>
        )}
        {approval.status === 'RESUBMIT' && <button className="btn-primary text-xs" onClick={() => save({ status: 'SUBMITTED', submitDate: new Date().toISOString() })}>Resubmit</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSave} className="card lg:col-span-2 space-y-4">
          <h2 className="font-semibold">Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">Reference</label><input name="reference" className="input-field" defaultValue={approval.reference || ''} /></div>
            <div><label className="label-field">Supplier</label><input name="supplierName" className="input-field" defaultValue={approval.supplierName || ''} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">Submit Date</label><input name="submitDate" type="date" className="input-field" defaultValue={fmt(approval.submitDate)} /></div>
            <div><label className="label-field">Approval Date</label><input name="approvalDate" type="date" className="input-field" defaultValue={fmt(approval.approvalDate)} /></div>
          </div>
          <div><label className="label-field">Customer Comments</label><textarea name="customerComments" className="input-field" rows={2} defaultValue={approval.customerComments || ''} /></div>
          <div><label className="label-field">Internal Notes</label><textarea name="notes" className="input-field" rows={2} defaultValue={approval.notes || ''} /></div>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>

        <div className="card">
          <h2 className="font-semibold mb-3">Photos</h2>
          <ImageUploader images={approval.imageUrls || []} onChange={urls => save({ imageUrls: urls })} />
        </div>
      </div>
    </div>
  );
}
