'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { computeLineCostLocal, computeLineCostQuoted, computeSellingPrice } from '@/lib/costing';
import MaterialSearchInput from '@/components/MaterialSearchInput';

export default function SRSCostingPage() {
  const { id } = useParams();
  const [srs, setSRS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [costingLoaded, setCostingLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [costing, setCosting] = useState(null);
  const [versions, setVersions] = useState([]);   // all versions, newest first
  const [currentCostingId, setCurrentCostingId] = useState(null);

  useEffect(() => {
    fetch(`/api/srs/${id}`).then(r => r.json()).then(setSRS).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetch(`/api/costing-sheets/${id}`)
      .then(r => r.json())
      .then(d => {
        const allVersions = d.versions || (d.costing ? [d.costing] : []);
        setVersions(allVersions);
        setCosting(allVersions[0] || null);
        setCurrentCostingId(allVersions[0]?.id || null);
      })
      .catch(() => { setCosting(null); })
      .finally(() => setCostingLoaded(true));
  }, [id]);

  function switchVersion(v) {
    setCosting(v);
    setCurrentCostingId(v.id);
  }

  function ensureCosting() {
    return costing || {
      fabricDetails: [], trimDetails: [], laborDetails: [], packingDetails: [], misDetails: [], freightDetails: [], dutyDetails: [],
      agentCommPercent: 0, targetMarginPercent: 0, pricingBasis: 'FOB',
      localCurrency: 'CNY', quoteCurrency: 'USD', exchangeRate: 7, actualQuotedPrice: null,
    };
  }

  function setSegment(segKey, nextLines) { setCosting(prev => ({ ...(prev || ensureCosting()), [segKey]: nextLines })); }
  function setField(key, value) { setCosting(prev => ({ ...(prev || ensureCosting()), [key]: value })); }

  async function saveCosting() {
    const payload = { ...ensureCosting(), costingId: currentCostingId };
    setSaving(true);
    try {
      const res = await fetch(`/api/costing-sheets/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCosting(data);
      // Refresh versions list so prices update
      setVersions(prev => prev.map(v => v.id === data.id ? data : v));
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch (e) { alert('Failed to save costing'); }
    finally { setSaving(false); }
  }

  async function createVersion() {
    setCreatingVersion(true);
    try {
      const res = await fetch(`/api/costing-sheets/${id}/version`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: currentCostingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setVersions(data.versions || []);
      setCosting(data.costing);
      setCurrentCostingId(data.costing.id);
    } catch (e) { alert('Failed to create new version'); }
    finally { setCreatingVersion(false); }
  }

  if (loading || !costingLoaded) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!srs) return <div className="text-center py-20 text-red-500">SRS not found</div>;

  const cs = ensureCosting();
  const defaultRate = Number(cs.exchangeRate) || 1;
  const localCur = cs.localCurrency || 'CNY';
  const quoteCur = cs.quoteCurrency || 'USD';

  const allSegments = [
    { key: 'fabricDetails',  label: 'Fabric',  category: 'FABRIC'  },
    { key: 'trimDetails',    label: 'Trim',    category: 'TRIM'    },
    { key: 'laborDetails',   label: 'Labor',   category: null      },
    { key: 'packingDetails', label: 'Packing', category: 'PACKING' },
    { key: 'misDetails',     label: 'MIS',     category: null      },
    { key: 'freightDetails', label: 'Freight', category: null      },
    { key: 'dutyDetails',    label: 'Duty',    category: null      },
  ];

  let totalLocal = 0, totalQuoted = 0;
  allSegments.forEach(seg => {
    (Array.isArray(cs[seg.key]) ? cs[seg.key] : []).forEach(l => {
      const costLocal = computeLineCostLocal(l);
      const rate = Number(l.exchangeRate) || defaultRate;
      totalLocal += costLocal;
      totalQuoted += computeLineCostQuoted({ costLocal, exchangeRate: rate });
    });
  });

  const agentComm = Number(cs.agentCommPercent) || 0;
  const margin = Number(cs.targetMarginPercent) || 0;
  const agentCommAmount = totalQuoted * (agentComm / 100);
  const autoSellingPrice = computeSellingPrice(totalQuoted, agentComm, margin);
  const effectivePrice = cs.actualQuotedPrice != null ? Number(cs.actualQuotedPrice) : autoSellingPrice;
  const grossProfit = effectivePrice - totalQuoted - agentCommAmount;
  const gpPercent = effectivePrice > 0 ? (grossProfit / effectivePrice * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/dashboard/costing" className="text-sm text-blue-600 mb-1 inline-block hover:underline">
            ← Back to Costing Sheets
          </Link>
          <h1 className="text-2xl font-bold">{srs.styleNo || '—'}</h1>
          <p className="text-gray-500 text-sm">{srs.customer?.name} · Costing Sheet</p>
        </div>
        <div className="flex items-center gap-3">
          {savedToast && (
            <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg animate-pulse">
              ✓ Costing saved
            </span>
          )}
          <button type="button" className="btn-primary" disabled={saving} onClick={saveCosting}>
            {saving ? 'Saving…' : 'Save Costing'}
          </button>
        </div>
      </div>

      {/* Version bar */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs text-gray-400 font-medium mr-1">Versions:</span>
        {[...versions].reverse().map(v => {
          const isActive = v.id === currentCostingId;
          const label = v.versionLabel ? `v${v.revisionNo} · ${v.versionLabel}` : `v${v.revisionNo}`;
          const price = v.actualQuotedPrice != null
            ? `${v.quoteCurrency || 'USD'} ${Number(v.actualQuotedPrice).toFixed(2)}`
            : v.sellingPrice && Number(v.sellingPrice) > 0
              ? `${v.quoteCurrency || 'USD'} ${Number(v.sellingPrice).toFixed(2)}`
              : null;
          return (
            <button key={v.id} type="button"
              onClick={() => switchVersion(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {label}{price ? ` — ${price}` : ''}
            </button>
          );
        })}
        <button type="button" onClick={createVersion} disabled={creatingVersion}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 border border-dashed border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50">
          {creatingVersion ? 'Creating…' : '＋ New Version'}
        </button>
      </div>

      <div className="card">
        <p className="text-sm text-gray-500 mb-4">
          Local costs in {localCur}, quoted in {quoteCur}. Exchange rate: 1 {quoteCur} = {defaultRate} {localCur}
        </p>

        {/* Currency & Rate Settings */}
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
          <Segment key={seg.key} title={seg.label}
            category={seg.category}
            lines={cs[seg.key] || []}
            onChange={next => setSegment(seg.key, next)}
            defaultExchangeRate={defaultRate}
            localCurrency={localCur}
            quoteCurrency={quoteCur}
          />
        ))}

        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Cost Summary</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Cost ({localCur})</span><span className="font-medium">{localCur} {totalLocal.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Cost ({quoteCur})</span><span className="font-medium">{quoteCur} {totalQuoted.toFixed(4)}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-gray-500">Agent Commission ({agentComm}%)</span><span>{quoteCur} {agentCommAmount.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Cost + Commission</span><span>{quoteCur} {(totalQuoted + agentCommAmount).toFixed(4)}</span></div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-500">{cs.actualQuotedPrice != null ? 'Actual Quoted Price' : 'Auto Selling Price'}</span>
                  <span className="font-medium">{quoteCur} {effectivePrice.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-semibold pt-1 border-t-2 ${grossProfit >= 0 ? 'border-green-300 text-green-700' : 'border-red-300 text-red-600'}`}>
                  <span>Gross Profit</span>
                  <span>{quoteCur} {grossProfit.toFixed(4)} <span className="text-xs font-normal opacity-75">({gpPercent.toFixed(1)}%)</span></span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Agent Commission %</label>
                  <input type="number" step="0.1" className="input-field" value={cs.agentCommPercent ?? 0}
                    onChange={e => setField('agentCommPercent', parseFloat(e.target.value || '0'))} />
                </div>
                <div>
                  <label className="label-field">Target Margin %</label>
                  <input type="number" step="0.1" className="input-field" value={cs.targetMarginPercent ?? 0}
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

function Segment({ title, category, lines, onChange, defaultExchangeRate, localCurrency, quoteCurrency }) {
  const safeLines = Array.isArray(lines) ? lines : [];

  function addLine() {
    onChange([...safeLines, { materialId: null, name: '', unitPriceLocal: null, unitPricePerMeter: null, consumption: 0, vatRefund: false, vatPercent: 0, exchangeRate: null }]);
  }
  function updateLine(i, patch) { onChange(safeLines.map((l, idx) => idx === i ? { ...l, ...patch } : l)); }
  function removeLine(i) { onChange(safeLines.filter((_, idx) => idx !== i)); }

  // Helper: resolve effective rate — null means "inherit from default"
  function effectiveRate(l) { return l.exchangeRate != null ? Number(l.exchangeRate) : defaultExchangeRate; }

  let subtotalLocal = 0, subtotalQuoted = 0;
  safeLines.forEach(l => {
    const costLocal = computeLineCostLocal(l);
    subtotalLocal += costLocal;
    subtotalQuoted += computeLineCostQuoted({ costLocal, exchangeRate: effectiveRate(l) });
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
              <th className="text-center px-3 py-2">Material / Name</th>
              <th className="text-center px-3 py-2">Unit Price ({localCurrency})</th>
              <th className="text-center px-3 py-2">Consumption</th>
              <th className="text-center px-3 py-2">VAT</th>
              <th className="text-center px-3 py-2">VAT %</th>
              <th className="text-center px-3 py-2">Exch Rate</th>
              <th className="text-center px-3 py-2">Cost ({localCurrency})</th>
              <th className="text-center px-3 py-2">Cost ({quoteCurrency})</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {safeLines.length === 0
              ? <tr><td className="px-3 py-3 text-gray-400 text-center" colSpan={9}>No lines — click "+ Add line" to start</td></tr>
              : safeLines.map((l, idx) => {
                const unitPrice = l.unitPriceLocal ?? l.unitPricePerMeter ?? null;
                const costLocal = computeLineCostLocal({
                  unitPriceLocal: unitPrice, consumption: l.consumption,
                  vatRefund: !!l.vatRefund, vatPercent: l.vatPercent ?? 0,
                });
                const rate = effectiveRate(l);
                const costQuoted = computeLineCostQuoted({ costLocal, exchangeRate: rate });

                return (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-3 py-2 text-center min-w-[180px]">
                      {category ? (
                        <MaterialSearchInput
                          category={category}
                          line={l}
                          onSelect={patch => updateLine(idx, patch)}
                        />
                      ) : (
                        <input className="input-field text-xs text-center" value={l.name || ''} onChange={e => updateLine(idx, { name: e.target.value })} placeholder="Name" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input className="input-field text-xs w-24 text-center" type="number" step="0.0001"
                        value={unitPrice ?? ''} onChange={e => { const v = e.target.value === '' ? null : parseFloat(e.target.value); updateLine(idx, { unitPriceLocal: v, unitPricePerMeter: v }); }} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input className="input-field text-xs w-20 text-center" type="number" step="0.0001"
                        value={l.consumption ?? ''}
                        placeholder="0"
                        onChange={e => updateLine(idx, { consumption: e.target.value === '' ? null : parseFloat(e.target.value) })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={!!l.vatRefund} onChange={e => updateLine(idx, { vatRefund: e.target.checked })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input className="input-field text-xs w-16 text-center" type="number" step="0.01"
                        value={l.vatPercent ?? ''}
                        placeholder="0"
                        onChange={e => updateLine(idx, { vatPercent: e.target.value === '' ? null : parseFloat(e.target.value) })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          className={`input-field text-xs w-20 text-center ${l.exchangeRate == null ? 'text-gray-400 bg-gray-50' : ''}`}
                          type="number" step="0.0001"
                          value={rate}
                          title={l.exchangeRate == null ? 'Inherited from default — type to override' : 'Custom rate — click × to reset to default'}
                          onChange={e => {
                            const v = e.target.value === '' ? null : parseFloat(e.target.value);
                            updateLine(idx, { exchangeRate: v });
                          }}
                        />
                        {l.exchangeRate != null && (
                          <button
                            type="button"
                            title="Reset to default rate"
                            className="text-gray-400 hover:text-gray-600 text-xs leading-none"
                            onClick={() => updateLine(idx, { exchangeRate: null })}
                          >↺</button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-xs text-gray-500">{costLocal.toFixed(4)}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap font-medium">{costQuoted.toFixed(4)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeLine(idx)}>×</button>
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
