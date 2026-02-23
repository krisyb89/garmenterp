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
          <thead>
            <tr>
              <th style={{ width: 60 }}></th>
              <th>Style #</th>
              <th>Customer</th>
              <th>Target Price</th>
              <th>Quoted Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {srsList.map(srs => {
              const thumb = Array.isArray(srs.imageUrls) && srs.imageUrls.length > 0 ? srs.imageUrls[0] : null;
              const cs = srs.costingSheet;
              const quotedPrice = cs?.actualQuotedPrice
                ? `${cs.quoteCurrency || 'USD'} ${Number(cs.actualQuotedPrice).toFixed(2)}`
                : cs?.sellingPrice && Number(cs.sellingPrice) > 0
                  ? `${cs.quoteCurrency || 'USD'} ${Number(cs.sellingPrice).toFixed(2)}`
                  : '—';
              return (
                <tr key={srs.id}>
                  <td className="px-2 py-1.5">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 shadow-sm mx-auto">
                      {thumb
                        ? <img src={thumb} alt="" className="w-full h-full object-contain" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📷</div>
                      }
                    </div>
                  </td>
                  <td className="font-medium">{srs.styleNo || '—'}</td>
                  <td>{srs.customer?.name}</td>
                  <td>{srs.targetPrice ? `${srs.targetPriceCurrency} ${srs.targetPrice}` : '—'}</td>
                  <td className="font-medium text-green-600">{quotedPrice}</td>
                  <td><StatusBadge status={srs.status} /></td>
                  <td><Link href={`/dashboard/srs/${srs.id}/costing`} className="text-blue-600 text-sm hover:underline">Open Costing →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {srsList.length === 0 && <p className="text-center py-8 text-gray-400">No SRS yet</p>}
      </div>
    </div>
  );
}
