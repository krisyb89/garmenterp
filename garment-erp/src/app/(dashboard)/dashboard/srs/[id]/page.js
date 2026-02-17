// src/app/(dashboard)/dashboard/srs/[id]/page.js
'use client';
import { useParams } from 'next/navigation';

import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { computeLineCostLocal } from '@/lib/costing';

export default function SRSDetailPage() {
  const { id } = useParams();
  const [srs, setSRS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [costing, setCosting] = useState(null);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    fetch(`/api/srs/${id}`).then(r => r.json()).then(setSRS).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch(`/api/costing-sheets/${id}`)
      .then(r => r.json())
      .then(d => {
        setCosting(d.costing || null);
        setMaterials(d.materials || []);
      })
      .catch(() => {
        setCosting(null);
        setMaterials([]);
      });
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

  const materialById = useMemo(() => Object.fromEntries(materials.map(m => [m.id, m])), [materials]);

  function ensureCosting() {
    return costing || {
      fabricDetails: [], trimDetails: [], laborDetails: [], packingDetails: [], misDetails: [], freightDetails: [], dutyDetails: [],
      agentCommPercent: 0, targetMarginPercent: 0, pricingBasis: 'FOB', currency: 'USD',
    };
  }

  function setSegment(segKey, nextLines) {
    setCosting(prev => ({ ...(prev || ensureCosting()), [segKey]: nextLines }));
  }

  async function saveCosting() {
    const payload = ensureCosting();
    setSaving(true);
    try {
      const res = await fetch(`/api/costing-sheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCosting(data);
      // Refresh SRS basic view (so list page can show updated selling price)
      setSRS(prev => ({ ...prev, costingSheet: data }));
    } catch (e) {
      console.error(e);
      alert('Failed to save costing');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!srs) return <div className="text-center py-20 text-red-500">SRS not found</div>;

  const cs = costing || srs.costingSheet || {};

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
            <div className="flex justify-between"><dt className="text-gray-500">Style #</dt><dd className="text-right">{srs.styleNo}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Brand</dt><dd className="text-right">{srs.brand || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Color / Print</dt><dd className="text-right max-w-[60%]">{srs.colorPrint || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Deadline</dt><dd className="text-right">{srs.deadline ? new Date(srs.deadline).toLocaleDateString() : '—'}</dd></div>
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
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold">Costing Sheet (Per Unit)</h2>
            <p className="text-sm text-gray-500">Segments: Fabric, Trim, Labor, Packing, MIS, Freight, Duty. VAT refund toggle per line.</p>
          </div>
          <button type="button" className="btn-primary" disabled={saving} onClick={saveCosting}>{saving ? 'Saving...' : 'Save Costing'}</button>
        </div>

        <Segment
          title="Fabric"
          lines={ensureCosting().fabricDetails || []}
          materials={materials.filter(m => m.category?.name === 'FABRIC')}
          materialById={materialById}
          onChange={(next) => setSegment('fabricDetails', next)}
          mode="perMeter"
        />
        <Segment
          title="Trim"
          lines={ensureCosting().trimDetails || []}
          materials={materials.filter(m => m.category?.name === 'TRIM')}
          materialById={materialById}
          onChange={(next) => setSegment('trimDetails', next)}
          mode="perLocal"
        />
        <Segment title="Labor" lines={ensureCosting().laborDetails || []} materials={[]} materialById={materialById} onChange={(n) => setSegment('laborDetails', n)} mode="perLocal" />
        <Segment title="Packing" lines={ensureCosting().packingDetails || []} materials={materials.filter(m => m.category?.name === 'PACKING')} materialById={materialById} onChange={(n) => setSegment('packingDetails', n)} mode="perLocal" />
        <Segment title="MIS" lines={ensureCosting().misDetails || []} materials={[]} materialById={materialById} onChange={(n) => setSegment('misDetails', n)} mode="perLocal" />
        <Segment title="Freight" lines={ensureCosting().freightDetails || []} materials={[]} materialById={materialById} onChange={(n) => setSegment('freightDetails', n)} mode="perLocal" />
        <Segment title="Duty" lines={ensureCosting().dutyDetails || []} materials={[]} materialById={materialById} onChange={(n) => setSegment('dutyDetails', n)} mode="perLocal" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-4 border-t">
          <div>
            <label className="label-field">Agent Commission %</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={ensureCosting().agentCommPercent ?? 0}
              onChange={e => setCosting(prev => ({ ...(prev || ensureCosting()), agentCommPercent: parseFloat(e.target.value || '0') }))}
            />
          </div>
          <div>
            <label className="label-field">Target Margin %</label>
            <input
              type="number"
              step="0.1"
              className="input-field"
              value={ensureCosting().targetMarginPercent ?? 0}
              onChange={e => setCosting(prev => ({ ...(prev || ensureCosting()), targetMarginPercent: parseFloat(e.target.value || '0') }))}
            />
          </div>
          <div>
            <label className="label-field">Selling Price (auto)</label>
            <div className="input-field bg-green-50 font-bold text-green-700">
              {cs.sellingPrice != null ? `$ ${Number(cs.sellingPrice).toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">Total cost: {cs.totalCostPerUnit != null ? `$ ${Number(cs.totalCostPerUnit).toFixed(2)}` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Segment({ title, lines, materials, materialById, onChange, mode }) {
  const safeLines = Array.isArray(lines) ? lines : [];

  function addLine() {
    onChange([...(safeLines || []), { materialId: null, name: '', unitPricePerMeter: null, unitPriceLocal: null, consumption: 0, vatRefund: false, vatPercent: 0 }]);
  }

  function updateLine(i, patch) {
    const next = safeLines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange(next);
  }

  function removeLine(i) {
    onChange(safeLines.filter((_, idx) => idx !== i));
  }

  const total = safeLines.reduce((sum, l) => sum + computeLineCostLocal(l), 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Subtotal: {Number(total).toFixed(2)}</span>
          <button type="button" className="btn-secondary" onClick={addLine}>+ Add line</button>
        </div>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-2">Material / Name</th>
              <th className="text-left px-3 py-2">Unit Price</th>
              <th className="text-left px-3 py-2">Consumption</th>
              <th className="text-left px-3 py-2">VAT refund</th>
              <th className="text-left px-3 py-2">VAT %</th>
              <th className="text-left px-3 py-2">Cost (local)</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {safeLines.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={7}>No lines</td></tr>
            ) : safeLines.map((l, idx) => {
              const mat = l.materialId ? materialById[l.materialId] : null;
              const vatPercent = l.vatPercent != null ? l.vatPercent : (mat?.vatPercent ?? 0);
              const unitPrice = mode === 'perMeter'
                ? (l.unitPricePerMeter != null ? l.unitPricePerMeter : (mat?.pricePerMeter ?? null))
                : (l.unitPriceLocal != null ? l.unitPriceLocal : null);
              const computed = computeLineCostLocal({
                unitPricePerMeter: mode === 'perMeter' ? unitPrice : null,
                unitPriceLocal: mode !== 'perMeter' ? unitPrice : null,
                consumption: l.consumption,
                vatRefund: !!l.vatRefund,
                vatPercent,
              });

              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {materials.length > 0 ? (
                      <select
                        className="select-field"
                        value={l.materialId || ''}
                        onChange={e => {
                          const id = e.target.value || null;
                          const m = id ? materialById[id] : null;
                          updateLine(idx, {
                            materialId: id,
                            name: m ? `${m.code} - ${m.name}` : '',
                            vatPercent: m?.vatPercent ?? 0,
                            unitPricePerMeter: mode === 'perMeter' ? (m?.pricePerMeter ?? null) : l.unitPricePerMeter,
                          });
                        }}
                      >
                        <option value="">Select...</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.code} • {m.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input-field" value={l.name || ''} onChange={e => updateLine(idx, { name: e.target.value })} placeholder="Name" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input-field"
                      type="number"
                      step="0.0001"
                      value={unitPrice ?? ''}
                      onChange={e => {
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        updateLine(idx, mode === 'perMeter' ? { unitPricePerMeter: v } : { unitPriceLocal: v });
                      }}
                      placeholder={mode === 'perMeter' ? 'Price/m' : 'Unit price'}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input-field"
                      type="number"
                      step="0.0001"
                      value={l.consumption ?? 0}
                      onChange={e => updateLine(idx, { consumption: parseFloat(e.target.value || '0') })}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!l.vatRefund} onChange={e => updateLine(idx, { vatRefund: e.target.checked })} />
                      <span>Refund</span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input-field"
                      type="number"
                      step="0.01"
                      value={vatPercent}
                      onChange={e => updateLine(idx, { vatPercent: parseFloat(e.target.value || '0') })}
                    />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{Number(computed).toFixed(4)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeLine(idx)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
