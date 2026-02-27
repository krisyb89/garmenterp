// src/app/(dashboard)/dashboard/approvals/page.js
'use client';
import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams();
    if (typeFilter) p.set('type', typeFilter);
    if (statusFilter) p.set('status', statusFilter);
    fetch(`/api/approvals?${p}`).then(r => r.json()).then(d => setApprovals(d.approvals || [])).finally(() => setLoading(false));
  }, [typeFilter, statusFilter]);

  const types = ['', 'LAB_DIP', 'FABRIC', 'TRIM', 'PRINT_STRIKEOFF', 'EMBROIDERY_STRIKEOFF', 'WASH'];
  const statuses = ['', 'PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMIT'];

  // Summary counts
  const pending = approvals.filter(a => a.status === 'PENDING' || a.status === 'SUBMITTED').length;

  return (
    <div>
      <PageHeader 
        title="Approvals Dashboard" 
        subtitle={`${pending} pending approvals`}
        action={{ href: '/dashboard/approvals/new', label: '+ New Approval' }}
      />
      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-500 mr-1">Type:</span>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2 py-1 rounded text-xs font-medium ${typeFilter === t ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t ? t.replace(/_/g, ' ') : 'All'}
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
        approvals.length === 0 ? <div className="card text-center py-12 text-gray-400">No approvals found</div> :
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead><tr><th>Style</th><th>Customer</th><th>Type</th><th>Material</th><th>Submit#</th><th>Reference</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>{approvals.map(a => (
              <tr key={a.id}>
                <td className="font-medium"><a href={`/dashboard/styles/${a.styleId}`} className="text-blue-600">{a.style?.styleNo}</a></td>
                <td>{a.style?.customer?.name || '—'}</td>
                <td><span className="status-badge bg-purple-100 text-purple-700">{a.type.replace(/_/g, ' ')}</span></td>
                <td>{a.material?.name || '—'}</td>
                <td>#{a.submissionNo}</td>
                <td>{a.reference || '—'}</td>
                <td>{a.submitDate ? new Date(a.submitDate).toLocaleDateString() : '—'}</td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </div>
  );
}
