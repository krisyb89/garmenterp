// src/app/(dashboard)/dashboard/styles/[id]/page.js
'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ImageUploader from '@/components/ImageUploader';

export default function StyleDetailPage({ params }) {
  const { id } = use(params);
  const [style, setStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch(`/api/styles/${id}`).then(r => r.json()).then(setStyle).finally(() => setLoading(false)); }, [id]);

  async function saveImages(urls) {
    setSaving(true);
    const res = await fetch(`/api/styles/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrls: urls }) });
    const data = await res.json();
    setStyle(prev => ({ ...prev, imageUrls: data.imageUrls }));
    setSaving(false);
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!style) return <div className="text-center py-20 text-red-500">Style not found</div>;

  return (
    <div>
      <Link href="/dashboard/styles" className="text-sm text-blue-600 mb-2 inline-block">← Styles</Link>
      <h1 className="text-2xl font-bold mb-1">{style.styleNo}</h1>
      <p className="text-gray-500 text-sm mb-6">{style.customer?.name} • {style.category || 'No category'} • {style.season || ''}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Customer Ref</dt><dd>{style.customerRef || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Construction</dt><dd>{style.construction || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Fit Type</dt><dd>{style.fitType || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Description</dt><dd className="text-right max-w-[60%]">{style.description || '—'}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">BOM ({style.bomItems?.length || 0} items)</h2>
          {style.bomItems?.length === 0 ? <p className="text-sm text-gray-400">No BOM items</p> :
            <div className="space-y-2">{style.bomItems.map(b => (
              <div key={b.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                <span>{b.material?.name || b.description}</span>
                <span className="text-gray-500">{parseFloat(b.consumptionQty)} {b.consumptionUnit}</span>
              </div>
            ))}</div>}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">PO Lines</h2>
          {style.poLines?.length === 0 ? <p className="text-sm text-gray-400">Not on any POs</p> :
            <div className="space-y-2">{style.poLines.map(pl => (
              <Link key={pl.id} href={`/dashboard/purchase-orders/${pl.po?.id}`} className="flex justify-between text-sm py-1 hover:bg-gray-50 rounded">
                <span className="text-blue-600">{pl.po?.poNo}</span>
                <StatusBadge status={pl.po?.status} />
              </Link>
            ))}</div>}
        </div>
      </div>

      {/* Style Images */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Style Images</h2>
        <ImageUploader images={style.imageUrls || []} onChange={saveImages} />
      </div>

      {/* Samples */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Samples ({style.samples?.length || 0})</h2>
          <Link href={`/dashboard/samples/new?styleId=${id}`} className="btn-primary text-xs">+ Add Sample</Link>
        </div>
        {style.samples?.length === 0 ? <p className="text-sm text-gray-400">No samples yet</p> :
          <table className="table-base">
            <thead><tr><th>Stage</th><th>Rev#</th><th>Size</th><th>Sent</th><th>Received</th><th>Status</th><th></th></tr></thead>
            <tbody>{style.samples.map(s => (
              <tr key={s.id}>
                <td><span className="status-badge bg-blue-100 text-blue-700">{s.stage}</span></td>
                <td>#{s.revisionNo}</td>
                <td>{s.size || '—'}</td>
                <td>{s.dateSent ? new Date(s.dateSent).toLocaleDateString() : '—'}</td>
                <td>{s.dateReceived ? new Date(s.dateReceived).toLocaleDateString() : '—'}</td>
                <td><StatusBadge status={s.status} /></td>
                <td><Link href={`/dashboard/samples/${s.id}`} className="text-blue-600 text-xs">Open →</Link></td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      {/* Approvals */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Approvals ({style.approvals?.length || 0})</h2>
          <Link href={`/dashboard/approvals/new?styleId=${id}`} className="btn-primary text-xs">+ Add Approval</Link>
        </div>
        {style.approvals?.length === 0 ? <p className="text-sm text-gray-400">No approvals yet</p> :
          <table className="table-base">
            <thead><tr><th>Type</th><th>Submit#</th><th>Reference</th><th>Supplier</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
            <tbody>{style.approvals.map(a => (
              <tr key={a.id}>
                <td><span className="status-badge bg-purple-100 text-purple-700">{a.type.replace(/_/g, ' ')}</span></td>
                <td>#{a.submissionNo}</td>
                <td>{a.reference || '—'}</td>
                <td>{a.supplierName || '—'}</td>
                <td>{a.submitDate ? new Date(a.submitDate).toLocaleDateString() : '—'}</td>
                <td><StatusBadge status={a.status} /></td>
                <td><Link href={`/dashboard/approvals/${a.id}`} className="text-blue-600 text-xs">Open →</Link></td>
              </tr>
            ))}</tbody>
          </table>}
      </div>
    </div>
  );
}
