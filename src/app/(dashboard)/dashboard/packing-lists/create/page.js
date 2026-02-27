// src/app/(dashboard)/dashboard/packing-lists/create/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

const SIZE_ORDER = ['XXS','XS','S','M','L','XL','2XL','XXL','3XL','XXXL','4XL','5XL'];
function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

export default function CreatePackingListPage() {
  const router = useRouter();
  const [pos, setPOs] = useState([]);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [poDetail, setPODetail] = useState(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [notes, setNotes] = useState('');
  const [exFtyDate, setExFtyDate] = useState('');
  const [cartonGroups, setCartonGroups] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then(r => r.json())
      .then(d => setPOs((d.purchaseOrders || []).filter(po => !['CLOSED', 'CANCELLED', 'FULLY_SHIPPED'].includes(po.status))));
  }, []);

  async function handlePOSelect(poId) {
    setSelectedPOId(poId);
    setCartonGroups([]);
    if (!poId) { setPODetail(null); return; }
    setLoadingPO(true);
    const res = await fetch(`/api/purchase-orders/${poId}`);
    setPODetail(await res.json());
    setLoadingPO(false);
  }

  function getSizesForLineItem(lineItemId) {
    if (!poDetail?.lineItems) return [];
    if (lineItemId) {
      const li = poDetail.lineItems.find(l => l.id === lineItemId);
      if (li?.sizeBreakdown) return sortSizes(Object.keys(li.sizeBreakdown).filter(s => li.sizeBreakdown[s] > 0));
    }
    const all = new Set();
    poDetail.lineItems.forEach(li => {
      if (li.sizeBreakdown) Object.keys(li.sizeBreakdown).filter(s => li.sizeBreakdown[s] > 0).forEach(s => all.add(s));
    });
    return sortSizes([...all]);
  }

  function getDCsForLineItem(li) {
    if (!li?.shippingOrders || !Array.isArray(li.shippingOrders)) return [];
    return li.shippingOrders.map(so => so.dc).filter(Boolean);
  }

  function addCartonGroup() {
    setCartonGroups(prev => [...prev, {
      id: Date.now(), poLineItemId: '', styleNo: '', color: '', dcName: '',
      packType: 'PREPACK', prepackConfig: {}, cartonCount: 1,
      grossWeight: 0, netWeight: 0, length: 0, width: 0, height: 0,
    }]);
  }

  function removeCartonGroup(gid) { setCartonGroups(prev => prev.filter(g => g.id !== gid)); }

  function duplicateCartonGroup(gid) {
    const src = cartonGroups.find(g => g.id === gid);
    if (src) setCartonGroups(prev => [...prev, { ...src, id: Date.now(), prepackConfig: { ...src.prepackConfig } }]);
  }

  function updateGroup(gid, field, value) {
    setCartonGroups(prev => prev.map(g => {
      if (g.id !== gid) return g;
      const u = { ...g, [field]: value };
      if (field === 'poLineItemId' && poDetail?.lineItems) {
        const li = poDetail.lineItems.find(l => l.id === value);
        if (li) {
          u.styleNo = li.style?.styleNo || '';
          u.color = li.color || '';
          u.dcName = '';
          const sizes = sortSizes(Object.keys(li.sizeBreakdown || {}).filter(s => li.sizeBreakdown[s] > 0));
          const config = {};
          sizes.forEach(s => config[s] = 0);
          u.prepackConfig = config;
        }
      }
      return u;
    }));
  }

  function updatePrepackSize(gid, size, val) {
    setCartonGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, prepackConfig: { ...g.prepackConfig, [size]: parseInt(val) || 0 } }));
  }

  function ppc(g) { return Object.values(g.prepackConfig).reduce((s, v) => s + v, 0); }

  const totals = cartonGroups.reduce((a, g) => {
    const p = ppc(g);
    a.cartons += g.cartonCount; a.pcs += p * g.cartonCount;
    a.gw += (parseFloat(g.grossWeight) || 0) * g.cartonCount;
    a.nw += (parseFloat(g.netWeight) || 0) * g.cartonCount;
    a.cbm += (((parseFloat(g.length) || 0) * (parseFloat(g.width) || 0) * (parseFloat(g.height) || 0)) / 1e6) * g.cartonCount;
    return a;
  }, { cartons: 0, pcs: 0, gw: 0, nw: 0, cbm: 0 });

  async function handleSubmit(submitForReview = false) {
    if (!selectedPOId || cartonGroups.length === 0) return;
    setCreating(true);
    try {
      const plRes = await fetch('/api/packing-lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId: selectedPOId, notes: notes || null, exFtyDate: exFtyDate || null }),
      });
      if (!plRes.ok) { alert('Failed to create packing list'); setCreating(false); return; }
      const pl = await plRes.json();
      for (const g of cartonGroups) {
        await fetch(`/api/packing-lists/${pl.id}/cartons`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleNo: g.styleNo, color: g.color, poLineItemId: g.poLineItemId || null,
            dcName: g.dcName || null, packType: g.packType,
            prepackConfig: g.packType === 'PREPACK' ? g.prepackConfig : null,
            sizeBreakdown: g.prepackConfig, cartonCount: g.cartonCount,
            grossWeight: parseFloat(g.grossWeight) || 0, netWeight: parseFloat(g.netWeight) || 0,
            length: parseFloat(g.length) || 0, width: parseFloat(g.width) || 0, height: parseFloat(g.height) || 0,
          }),
        });
      }
      if (submitForReview) {
        await fetch(`/api/packing-lists/${pl.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'PENDING_REVIEW' }),
        });
      }
      router.push(`/dashboard/packing-lists/${pl.id}`);
    } catch (err) { alert('Error: ' + err.message); }
    setCreating(false);
  }

  const allSizes = poDetail?.lineItems ? sortSizes([...new Set(poDetail.lineItems.flatMap(li => Object.keys(li.sizeBreakdown || {})))]) : [];

  return (
    <div>
      <PageHeader title="Create Packing List" subtitle="Define carton groups with prepack configurations" />

      <div className="card mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">1. Select Purchase Order</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Purchase Order *</label>
            <select className="select-field" value={selectedPOId} onChange={e => handlePOSelect(e.target.value)}>
              <option value="">Select PO...</option>
              {pos.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.customer?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Ex-Factory Date</label>
            <input type="date" className="input-field" value={exFtyDate} onChange={e => setExFtyDate(e.target.value)} />
          </div>
          <div>
            <label className="label-field">Notes</label>
            <input className="input-field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
          {poDetail && <div className="text-sm text-gray-600 mt-6"><strong>{poDetail.poNo}</strong> — {poDetail.lineItems?.length || 0} lines, {(poDetail.totalQty || 0).toLocaleString()} pcs</div>}
        </div>
      </div>

      {poDetail && poDetail.lineItems?.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">PO Line Items</h3>
          <div className="overflow-x-auto">
            <table className="table-base text-sm">
              <thead><tr><th>Style</th><th>Color</th>{allSizes.map(s => <th key={s} className="text-center">{s}</th>)}<th className="text-right">Total</th><th>DCs</th></tr></thead>
              <tbody>
                {poDetail.lineItems.map(li => (
                  <tr key={li.id}>
                    <td className="font-medium">{li.style?.styleNo}</td><td>{li.color}</td>
                    {allSizes.map(s => <td key={s} className="text-center">{li.sizeBreakdown?.[s] || 0}</td>)}
                    <td className="text-right font-medium">{Object.values(li.sizeBreakdown || {}).reduce((s, v) => s + v, 0)}</td>
                    <td className="text-xs text-gray-500">{getDCsForLineItem(li).join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {poDetail && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">2. Carton Groups</h3>
            <button onClick={addCartonGroup} className="btn-primary text-sm">+ Add Carton Group</button>
          </div>
          {cartonGroups.length === 0 && <div className="text-center py-8 text-gray-400">Click &quot;+ Add Carton Group&quot; to start.</div>}
          <div className="space-y-6">
            {cartonGroups.map((g, idx) => {
              const li = poDetail.lineItems?.find(l => l.id === g.poLineItemId);
              const dcs = li ? getDCsForLineItem(li) : [];
              const groupSizes = getSizesForLineItem(g.poLineItemId);
              const p = ppc(g);
              return (
                <div key={g.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Group {idx + 1}</h4>
                    <div className="flex gap-2">
                      <button onClick={() => duplicateCartonGroup(g.id)} className="text-xs text-blue-600">Duplicate</button>
                      <button onClick={() => removeCartonGroup(g.id)} className="text-xs text-red-600">Remove</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="label-field text-xs">Style-Color *</label>
                      <select className="select-field text-sm" value={g.poLineItemId} onChange={e => updateGroup(g.id, 'poLineItemId', e.target.value)}>
                        <option value="">Select...</option>
                        {poDetail.lineItems?.map(l => <option key={l.id} value={l.id}>{l.style?.styleNo} — {l.color}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label-field text-xs">DC / Ship-To</label>
                      {dcs.length > 0 ? (
                        <select className="select-field text-sm" value={g.dcName} onChange={e => updateGroup(g.id, 'dcName', e.target.value)}>
                          <option value="">All / None</option>{dcs.map(dc => <option key={dc} value={dc}>{dc}</option>)}
                        </select>
                      ) : <input className="input-field text-sm" value={g.dcName} placeholder="DC name" onChange={e => updateGroup(g.id, 'dcName', e.target.value)} />}
                    </div>
                    <div>
                      <label className="label-field text-xs">Customer</label>
                      <input className="input-field text-sm bg-gray-100" value={poDetail.customer?.name || ''} readOnly />
                    </div>
                    <div>
                      <label className="label-field text-xs">Pack Type</label>
                      <select className="select-field text-sm" value={g.packType} onChange={e => updateGroup(g.id, 'packType', e.target.value)}>
                        <option value="PREPACK">Prepack</option><option value="SINGLE_SIZE">Single Size</option><option value="MIXED">Mixed</option>
                      </select>
                    </div>
                  </div>
                  {g.poLineItemId && groupSizes.length > 0 && (
                    <div className="mb-3">
                      <label className="label-field text-xs mb-1">Pcs per carton per size</label>
                      <div className="flex gap-2 flex-wrap items-end">
                        {groupSizes.map(size => (
                          <div key={size} className="text-center">
                            <div className="text-xs text-gray-500 mb-1">{size}</div>
                            <input type="number" min="0" className="input-field text-sm text-center w-16"
                              value={g.prepackConfig[size] || 0} onChange={e => updatePrepackSize(g.id, size, e.target.value)} />
                          </div>
                        ))}
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Per Ctn</div>
                          <div className="w-16 h-[38px] flex items-center justify-center font-bold text-blue-600 bg-blue-50 rounded-lg">{p}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3 mb-3">
                    <div><label className="label-field text-xs">Cartons #</label><input type="number" min="1" className="input-field text-sm" value={g.cartonCount} onChange={e => updateGroup(g.id, 'cartonCount', parseInt(e.target.value) || 1)} /></div>
                    <div><label className="label-field text-xs">GW/Ctn (kg)</label><input type="number" step="0.01" className="input-field text-sm" value={g.grossWeight} onChange={e => updateGroup(g.id, 'grossWeight', e.target.value)} /></div>
                    <div><label className="label-field text-xs">NW/Ctn (kg)</label><input type="number" step="0.01" className="input-field text-sm" value={g.netWeight} onChange={e => updateGroup(g.id, 'netWeight', e.target.value)} /></div>
                    <div><label className="label-field text-xs">L (cm)</label><input type="number" step="0.1" className="input-field text-sm" value={g.length} onChange={e => updateGroup(g.id, 'length', e.target.value)} /></div>
                    <div><label className="label-field text-xs">W (cm)</label><input type="number" step="0.1" className="input-field text-sm" value={g.width} onChange={e => updateGroup(g.id, 'width', e.target.value)} /></div>
                    <div><label className="label-field text-xs">H (cm)</label><input type="number" step="0.1" className="input-field text-sm" value={g.height} onChange={e => updateGroup(g.id, 'height', e.target.value)} /></div>
                    <div><label className="label-field text-xs">CBM/Ctn</label><div className="input-field text-sm bg-gray-100">{(((parseFloat(g.length)||0)*(parseFloat(g.width)||0)*(parseFloat(g.height)||0))/1e6).toFixed(4)}</div></div>
                  </div>
                  {p > 0 && (
                    <div className="bg-white rounded p-3 border text-sm">
                      <span className="text-gray-500">{g.cartonCount} ctns × {p} pcs/ctn = <strong>{p * g.cartonCount} pcs</strong></span>
                      <span className="ml-3">{groupSizes.filter(s => g.prepackConfig[s] > 0).map(s => `${s}:${(g.prepackConfig[s] || 0) * g.cartonCount}`).join(' | ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {cartonGroups.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
          <div className="overflow-x-auto mb-4">
            <table className="table-base text-sm">
              <thead><tr><th>#</th><th>Style</th><th>Color</th><th>DC</th><th>Ratio</th><th className="text-center">Pcs/Ctn</th><th className="text-center">Ctns</th><th className="text-center">Total Pcs</th><th className="text-right">GW</th><th className="text-right">NW</th></tr></thead>
              <tbody>
                {cartonGroups.map((g, i) => {
                  const p = ppc(g);
                  const sizes = getSizesForLineItem(g.poLineItemId);
                  return (
                    <tr key={g.id}><td>{i + 1}</td><td className="font-medium">{g.styleNo}</td><td>{g.color}</td><td>{g.dcName || '—'}</td>
                      <td className="text-xs">{sizes.filter(s => g.prepackConfig[s] > 0).map(s => g.prepackConfig[s]).join('-') || '—'}</td>
                      <td className="text-center">{p}</td><td className="text-center">{g.cartonCount}</td><td className="text-center font-medium">{p * g.cartonCount}</td>
                      <td className="text-right">{((parseFloat(g.grossWeight)||0)*g.cartonCount).toFixed(2)}</td><td className="text-right">{((parseFloat(g.netWeight)||0)*g.cartonCount).toFixed(2)}</td></tr>
                  );
                })}
              </tbody>
              <tfoot><tr className="font-bold border-t-2"><td colSpan={6}></td><td className="text-center">{totals.cartons}</td><td className="text-center">{totals.pcs}</td><td className="text-right">{totals.gw.toFixed(2)}</td><td className="text-right">{totals.nw.toFixed(2)}</td></tr></tfoot>
            </table>
          </div>
          <div className="text-sm text-gray-600 mb-4">CBM: <strong>{totals.cbm.toFixed(4)}</strong> | GW: <strong>{totals.gw.toFixed(2)} kg</strong> | NW: <strong>{totals.nw.toFixed(2)} kg</strong></div>
          <div className="flex gap-3">
            <button onClick={() => handleSubmit(false)} disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Save as Draft'}</button>
            <button onClick={() => handleSubmit(true)} disabled={creating} className="btn-success">Submit for Review</button>
            <button onClick={() => router.push('/dashboard/packing-lists')} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
