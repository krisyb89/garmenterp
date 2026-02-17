// src/app/(dashboard)/dashboard/samples/page.js
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function SamplesPage() {
  const [samples, setSamples] = useState([]);
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (stageFilter) p.set('stage', stageFilter);
    if (statusFilter) p.set('status', statusFilter);
    fetch(`/api/samples?${p}`).then(r => r.json()).then(d => setSamples(d.samples || [])).finally(() => setLoading(false));
  }, [stageFilter, statusFilter]);

  const stages = ['', 'PROTO', 'FIT', 'PP', 'TOP', 'SHIPMENT', 'GPT'];
  const statuses = ['', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Samples" subtitle="Track all sample submissions and approvals" />
        <Link href="/dashboard/samples/new" className="btn-primary text-sm">+ New Sample</Link>
      </div>
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-500 mr-1">Stage:</span>
          {stages.map(s => (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`px-2 py-1 rounded text-xs font-medium ${stageFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-500 mr-1">Status:</span>
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded text-xs font-medium ${statusFilter === s ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        samples.length === 0 ? <div className="card text-center py-12 text-gray-400">No samples found</div> :
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead><tr><th>Style</th><th>Customer</th><th>Stage</th><th>Rev#</th><th>Sent</th><th>Tracking</th><th>Status</th><th></th></tr></thead>
            <tbody>{samples.map(s => (
              <tr key={s.id}>
                <td className="font-medium">{s.style?.styleNo}</td>
                <td>{s.style?.customer?.name || '—'}</td>
                <td><span className="status-badge bg-blue-100 text-blue-700">{s.stage}</span></td>
                <td>#{s.revisionNo}</td>
                <td>{s.dateSent ? new Date(s.dateSent).toLocaleDateString() : '—'}</td>
                <td className="text-xs text-gray-500">{s.trackingNo || '—'}</td>
                <td><StatusBadge status={s.status} /></td>
                <td><Link href={`/dashboard/samples/${s.id}`} className="text-blue-600 text-sm">Open →</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </div>
  );
}
