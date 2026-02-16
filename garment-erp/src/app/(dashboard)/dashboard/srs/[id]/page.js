// src/app/(dashboard)/dashboard/srs/[id]/page.js
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function SRSDetailPage({ params }) {
  const { id } = use(params);
  const [srs, setSRS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/srs/${id}`).then(r => r.json()).then(setSRS).finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(newStatus) {
    setSaving(true);
    const res = await fetch(`/api/srs/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    setSRS(prev => ({ ...prev, status: data.status }));
    setSaving(false);
  }

  async function saveCosting(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const costData = {};
    for (const [k, v] of fd.entries()) costData[k] = v ? parseFloat(v) : 0;

    const total = (costData.fabricCost || 0) + (costData.trimCost || 0) + (costData.cmtCost || 0) +
      (costData.washingCost || 0) + (costData.embellishmentCost || 0) + (costData.packagingCost || 0) +
      (costData.freightCost || 0) + (costData.inspectionCost || 0) + (costData.dutyCost || 0) + (costData.otherCost || 0);

    const commAmt = total * ((costData.agentCommPercent || 0) / 100);
    const marginMultiplier = 1 + ((costData.targetMarginPercent || 0) / 100);
    const sellingPrice = (total + commAmt) * marginMultiplier;

    const payload = {
      ...costData, totalCostPerUnit: total, agentCommAmount: commAmt, sellingPrice,
    };

    // Save via updating SRS's costing sheet (we'd need a costing endpoint, but for now use SRS)
    // In production, create a /api/costing/[id] endpoint
    setSRS(prev => ({ ...prev, costingSheet: { ...prev.costingSheet, ...payload } }));
    setSaving(false);
    alert('Costing saved (in-memory). Add /api/costing endpoint for persistence.');
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!srs) return <div className="text-center py-20 text-red-500">SRS not found</div>;

  const cs = srs.costingSheet || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/srs" className="text-sm text-blue-600 mb-2 inline-block">← SRS List</Link>
          <h1 className="text-2xl font-bold">{srs.srsNo}</h1>
          <p className="text-gray-500 text-sm">{srs.customer?.name} • Created by {srs.createdBy?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={srs.status} />
          <select className="select-field w-auto text-sm" value={srs.status} onChange={e => updateStatus(e.target.value)} disabled={saving}>
            {['RECEIVED','UNDER_REVIEW','COSTING_IN_PROGRESS','QUOTED','CUSTOMER_CONFIRMED','DEVELOPMENT_STARTED','ORDER_RECEIVED','ON_HOLD','CANCELLED'].map(s =>
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Request Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Description</dt><dd className="text-right max-w-[60%]">{srs.description || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Target Price</dt><dd>{srs.targetPrice ? `${srs.targetPriceCurrency} ${srs.targetPrice}` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Est. Qty</dt><dd>{srs.estimatedQtyMin ? `${srs.estimatedQtyMin?.toLocaleString()} - ${srs.estimatedQtyMax?.toLocaleString()}` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Delivery Window</dt><dd>{srs.deliveryWindow || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Target Markets</dt><dd>{srs.targetMarkets || '—'}</dd></div>
          </dl>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Specifications</h2>
          <div className="space-y-3 text-sm">
            <div><span className="text-gray-500 block mb-1">Fabric</span><p>{srs.fabricSpecs || '—'}</p></div>
            <div><span className="text-gray-500 block mb-1">Trims</span><p>{srs.trimSpecs || '—'}</p></div>
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Notes</h2>
          <p className="text-sm text-gray-600">{srs.notes || 'No notes'}</p>
        </div>
      </div>

      {/* Costing Sheet */}
      <div className="card">
        <h2 className="font-semibold mb-4">Costing Sheet (Per Unit)</h2>
        <form onSubmit={saveCosting}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {[
              { name: 'fabricCost', label: 'Fabric' },
              { name: 'trimCost', label: 'Trim' },
              { name: 'cmtCost', label: 'CMT' },
              { name: 'washingCost', label: 'Washing' },
              { name: 'embellishmentCost', label: 'Embellishment' },
              { name: 'packagingCost', label: 'Packaging' },
              { name: 'freightCost', label: 'Freight' },
              { name: 'inspectionCost', label: 'Inspection' },
              { name: 'dutyCost', label: 'Duty' },
              { name: 'otherCost', label: 'Other' },
            ].map(f => (
              <div key={f.name}>
                <label className="label-field">{f.label}</label>
                <input name={f.name} type="number" step="0.01" className="input-field" defaultValue={parseFloat(cs[f.name]) || ''} placeholder="0.00" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t">
            <div>
              <label className="label-field">Agent Commission %</label>
              <input name="agentCommPercent" type="number" step="0.1" className="input-field" defaultValue={parseFloat(cs.agentCommPercent) || ''} />
            </div>
            <div>
              <label className="label-field">Target Margin %</label>
              <input name="targetMarginPercent" type="number" step="0.1" className="input-field" defaultValue={parseFloat(cs.targetMarginPercent) || ''} />
            </div>
            <div>
              <label className="label-field">Selling Price (auto)</label>
              <div className="input-field bg-green-50 font-bold text-green-700">
                {cs.sellingPrice ? `$ ${parseFloat(cs.sellingPrice).toFixed(2)}` : '—'}
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Calculate & Save'}</button>
        </form>
      </div>
    </div>
  );
}
