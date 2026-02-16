// src/app/(dashboard)/dashboard/costing/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function CostingPage() {
  const [srsList, setSRSList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/srs').then(r => r.json()).then(d => setSRSList(d.srsList || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <PageHeader title="Costing Sheets" subtitle="Cost estimation for all development requests" />

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead><tr><th>SRS#</th><th>Customer</th><th>Description</th><th>Target Price</th><th>Quoted Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {srsList.map(srs => (
              <tr key={srs.id}>
                <td className="font-medium">{srs.srsNo}</td>
                <td>{srs.customer?.name}</td>
                <td className="text-sm text-gray-500">{(srs.description || '—').substring(0, 40)}</td>
                <td>{srs.targetPrice ? `${srs.targetPriceCurrency} ${srs.targetPrice}` : '—'}</td>
                <td className="font-medium text-green-600">{srs.quotedPrice ? `${srs.targetPriceCurrency} ${srs.quotedPrice}` : '—'}</td>
                <td><StatusBadge status={srs.status} /></td>
                <td><Link href={`/dashboard/srs/${srs.id}`} className="text-blue-600 text-sm">Open Costing →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {srsList.length === 0 && <p className="text-center py-8 text-gray-400">No SRS yet</p>}
      </div>
    </div>
  );
}
