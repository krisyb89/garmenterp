'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { computeLineCostLocal, computeLineCostQuoted, computeSellingPrice } from '@/lib/costing';

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
      agentCommPercent: 0, targetMarginPercent: 0, pricingBasis: 'FOB',
      localCurrency: 'CNY', quoteCurrency: 'USD', exchangeRate: 7,
      actualQuotedPrice: null,
    };
  }

  function setSegment(segKey, nextLines) {
    setCosting(prev => ({ ...(prev || ensureCosting()), [segKey]: nextLines }));
  }

  function setField(key, value) {
    setCosting(prev => ({ ...(prev || ensureCosting()), [key]: value }));
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

  const cs = ensureCosting();
  const defaultRate = Number(cs.exchangeRate) || 1;
  const localCur = cs.localCurrency || 'CNY';
  const quoteCur = cs.quoteCurrency || 'USD';

  const allSegments = [
    { key: 'fabricDetails', label: 'Fabric' },
    { key: 'trimDetails', label: 'Trim' },
    { key: 'laborDetails', label: 'Labor' },
    { key: 'packingDetails', label: 'Packing' },
    { key: 'misDetails', label: 'MIS' },
    { key: 'freightDetails', label: 'Freight' },
    { key: 'dutyDetails', label: 'Duty' },
  ];

  let totalLocal = 0;
  let totalQuoted = 0;
  allSegments.forEach(seg => {
    const lines = Array.isArray(cs[seg.key]) ? cs[seg.key] : [];
    lines.forEach(l => {
      const costLocal = computeLineCostLocal(l);
      const rate = Number(l.exchangeRate) || defaultRate;
      const costQuoted = computeLineCostQuoted({ costLocal, exchangeRate: rate });
      totalLocal += costLocal;
      totalQuoted += costQuoted;
    });
  });

  const agentComm = Number(cs.agentCommPercent) || 0;
  const margin = Number(cs.targetMarginPercent) || 0;
  const agentCommAmount = totalQuoted * (agentComm / 100);
  const autoSellingPrice = computeSellingPrice(totalQuoted, agentComm, margin);

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
            <p className="text-sm text-gray-500">Local costs in {localCur}, quoted in {quoteCur}. Exchange rate: 1 {quoteCur} = {defaultRate} {localCur}</p>
          </div>
          <button type="button" className="btn-primary" disabled={saving} onClick={saveCosting}>{saving ? 'Saving...' : 'Save Costing'}</button>
        </div>

        {/* Currency & Exchange Rate Settings */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="label-field">Local Currency</label>
            <select className="select-field" value={localCur} onChange={e => setField('localCurrency', e.target.value)}>
              {['CNY','VND','BDT','INR','PKR','IDR','THB','KHR','MMK','PHP','EUR','GBP','USD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Quote Currency</label>
            <select className="select-field" value={quoteCur} onChange={e => setField('quoteCurrency', e.target.value)}>
              {['USD','EUR','GBP','CNY','JPY','AUD','CAD','HKD','SGD'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Default Exchange Rate</label>
            <input type="number" step="0.0001" className="input-field" value={cs.exchangeRate ?? 1}
              onChange={e => setField('exchangeRate', parseFloat(e.target.value || '1'))} />
            <span className="text-xs text-gray-400">1 {quoteCur} = ? {localCur}</span>
          </div>
          <div>
            <label className="label-field">Pricing Basis</label>
            <select className="select-field" value={cs.pricingBasis || 'FOB'} onChange={e => setField('pricingBasis', e.target.value)}>
              {['FOB','CIF','DDP','EXW','CFR'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* Segments */}
        {allSegments.map(seg => (
          <Segment
            key={seg.key}
            title={seg.label}
            lines={cs[seg.key] || []}
            materials={seg.key === 'fabricDetails' ? materials.filter(m => m.category?.name === 'FABRIC') :
                       seg.key === 'trimDetails' ? materials.filter(m => m.category?.name === 'TRIM') :
                       seg.key === 'packingDetails' ? materials.filter(m => m.category?.name === 'PACKING') : []}
            materialById={materialById}
            onChange={(next) => setSegment(seg.key, next)}
            defaultExchangeRate={defaultRate}
            localCurrency={localCur}
            quoteCurrency={quoteCur}
          />
        ))}

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Cost breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Cost Summary</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Cost ({localCur})</span><span className="font-medium">{localCur} {totalLocal.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Cost ({quoteCur})</span><span className="font-medium">{quoteCur} {totalQuoted.toFixed(4)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Agent Commission ({agentComm}%)</span><span>{quoteCur} {agentCommAmount.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Cost + Commission</span><span>{quoteCur} {(totalQuoted + agentCommAmount).toFixed(4)}</span></div>
              </div>
            </div>

            {/* Right: Pricing */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Agent Commission %</label>
                  <input type="number" step="0.1" className="input-field"
                    value={cs.agentCommPercent ?? 0}
                    onChange={e => setField('agentCommPercent', parseFloat(e.target.value || '0'))} />
                </div>
                <div>
                  <label className="label-field">Target Margin %</label>
                  <input type="number" step="0.1" className="input-field"
                    value={cs.targetMarginPercent ?? 0}
                    onChange={e => setField('targetMarginPercent', parseFloat(e.target.value || '0'))} />
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Auto Selling Price</span>
                  <span className="font-bold text-blue-700">{quoteCur} {autoSellingPrice.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-400">Formula: Cost+Comm / (1 - {margin}%)</div>
              </div>
              <div>
                <label className="label-field">Actual Quoted Price (manual override)</label>
                <input type="number" step="0.01" className="input-field border-green-300 focus:ring-green-500"
                  placeholder={`Leave blank to use auto: ${quoteCur} ${autoSellingPrice.toFixed(2)}`}
                  value={cs.actualQuotedPrice ?? ''}
                  onChange={e => setField('actualQuotedPrice', e.target.value === '' ? null : parseFloat(e.target.value))} />
                {cs.actualQuotedPrice != null && (
                  <div className="mt-1 text-sm font-semibold text-green-700">
                    Final Quote: {quoteCur} {Number(cs.actualQuotedPrice).toFixed(2)}
                    <span className="text-xs text-gray-400 ml-2">
                      (Margin: {totalQuoted > 0 ? ((1 - (totalQuoted + agentCommAmount) / Number(cs.actualQuotedPrice)) * 100).toFixed(1) : '—'}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Segment({ title, lines, materials, materialById, onChange, defaultExchangeRate, localCurrency, quoteCurrency }) {
  const safeLines = Array.isArray(lines) ? lines : [];

  function addLine() {
    onChange([...safeLines, { materialId: null, name: '', unitPriceLocal: null, unitPricePerMeter: null, consumption: 0, vatRefund: false, vatPercent: 0, exchangeRate: defaultExchangeRate }]);
  }

  function updateLine(i, patch) {
    const next = safeLines.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange(next);
  }

  function removeLine(i) {
    onChange(safeLines.filter((_, idx) => idx !== i));
  }

  let subtotalLocal = 0;
  let subtotalQuoted = 0;
  safeLines.forEach(l => {
    const costLocal = computeLineCostLocal(l);
    const rate = Number(l.exchangeRate) || defaultExchangeRate;
    const costQuoted = computeLineCostQuoted({ costLocal, exchangeRate: rate });
    subtotalLocal += costLocal;
    subtotalQuoted += costQuoted;
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{localCurrency} {subtotalLocal.toFixed(4)}</span>
          <span className="text-sm font-medium text-gray-700">{quoteCurrency} {subtotalQuoted.toFixed(4)}</span>
          <button type="button" className="btn-secondary text-xs" onClick={addLine}>+ Add line</button>
        </div>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-2">Material / Name</th>
              <th className="text-left px-3 py-2">Unit Price ({localCurrency})</th>
              <th className="text-left px-3 py-2">Consumption</th>
              <th className="text-left px-3 py-2">VAT</th>
              <th className="text-left px-3 py-2">VAT %</th>
              <th className="text-left px-3 py-2">Exch Rate</th>
              <th className="text-right px-3 py-2">Cost ({localCurrency})</th>
              <th className="text-right px-3 py-2">Cost ({quoteCurrency})</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {safeLines.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-400" colSpan={9}>No lines</td></tr>
            ) : safeLines.map((l, idx) => {
              const mat = l.materialId ? materialById[l.materialId] : null;
              const unitPrice = l.unitPriceLocal ?? l.unitPricePerMeter ?? (mat?.pricePerMeter ?? null);
              const costLocal = computeLineCostLocal({
                unitPriceLocal: unitPrice,
                consumption: l.consumption,
                vatRefund: !!l.vatRefund,
                vatPercent: l.vatPercent ?? (mat?.vatPercent ?? 0),
              });
              const rate = Number(l.exchangeRate) || defaultExchangeRate;
              const costQuoted = computeLineCostQuoted({ costLocal, exchangeRate: rate });

              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    {materials.length > 0 ? (
                      <select className="select-field text-xs" value={l.materialId || ''}
                        onChange={e => {
                          const mid = e.target.value || null;
                          const m = mid ? materialById[mid] : null;
                          updateLine(idx, {
                            materialId: mid,
                            name: m ? `${m.code} - ${m.name}` : '',
                            vatPercent: m?.vatPercent ?? 0,
                            unitPriceLocal: m?.pricePerMeter ?? l.unitPriceLocal,
                            unitPricePerMeter: m?.pricePerMeter ?? l.unitPricePerMeter,
                          });
                        }}>
                        <option value="">Select...</option>
                        {materials.map(m => <option key={m.id} value={m.id}>{m.code} • {m.name}</option>)}
                      </select>
                    ) : (
                      <input className="input-field text-xs" value={l.name || ''} onChange={e => updateLine(idx, { name: e.target.value })} placeholder="Name" />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input className="input-field text-xs w-24" type="number" step="0.0001"
                      value={unitPrice ?? ''} onChange={e => {
                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                        updateLine(idx, { unitPriceLocal: v, unitPricePerMeter: v });
                      }} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input-field text-xs w-20" type="number" step="0.0001"
                      value={l.consumption ?? 0} onChange={e => updateLine(idx, { consumption: parseFloat(e.target.value || '0') })} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={!!l.vatRefund} onChange={e => updateLine(idx, { vatRefund: e.target.checked })} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input-field text-xs w-16" type="number" step="0.01"
                      value={l.vatPercent ?? 0} onChange={e => updateLine(idx, { vatPercent: parseFloat(e.target.value || '0') })} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input-field text-xs w-20" type="number" step="0.0001"
                      value={rate} onChange={e => updateLine(idx, { exchangeRate: parseFloat(e.target.value || '1') })} />
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-500">{costLocal.toFixed(4)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium">{costQuoted.toFixed(4)}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeLine(idx)}>×</button>
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
