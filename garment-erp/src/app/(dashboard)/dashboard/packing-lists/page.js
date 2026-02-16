// src/app/(dashboard)/dashboard/packing-lists/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

export default function PackingListsPage() {
  const [packingLists, setPackingLists] = useState([]);
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPL, setSelectedPL] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showAddCarton, setShowAddCarton] = useState(false);

  useEffect(() => { reload(); }, []);

  async function reload() {
    const [plRes, poRes] = await Promise.all([
      fetch('/api/packing-lists').then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
    ]);
    setPackingLists(plRes.packingLists || []);
    setPOs(poRes.purchaseOrders || []);
    setLoading(false);
  }

  async function createPL(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch('/api/packing-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poId: fd.get('poId'), notes: fd.get('notes') }),
    });
    setShowCreate(false);
    reload();
  }

  async function openDetail(pl) {
    setSelectedPL(pl.id);
    const res = await fetch(`/api/packing-lists/${pl.id}`);
    setDetail(await res.json());
  }

  async function addCarton(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const lines = [];
    for (const size of SIZES) {
      const qty = parseInt(fd.get(`qty_${size}`) || 0);
      if (qty > 0) {
        lines.push({ styleNo: fd.get('styleNo'), color: fd.get('color'), size, qty });
      }
    }
    if (lines.length === 0) return;

    await fetch(`/api/packing-lists/${selectedPL}/cartons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines,
        length: fd.get('length'),
        width: fd.get('width'),
        height: fd.get('height'),
        grossWeight: fd.get('grossWeight'),
        netWeight: fd.get('netWeight'),
      }),
    });
    setShowAddCarton(false);
    // Refresh detail
    const res = await fetch(`/api/packing-lists/${selectedPL}`);
    setDetail(await res.json());
    reload();
  }

  async function deleteCarton(cartonId) {
    if (!confirm('Delete this carton?')) return;
    await fetch(`/api/packing-lists/${selectedPL}/cartons?cartonId=${cartonId}`, { method: 'DELETE' });
    const res = await fetch(`/api/packing-lists/${selectedPL}`);
    setDetail(await res.json());
    reload();
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  // Detail view
  if (detail) {
    const summaryMap = detail.summary || {};
    // Group summary by style|color → sizes
    const grouped = {};
    for (const [key, qty] of Object.entries(summaryMap)) {
      const [style, color, size] = key.split('|');
      const gKey = `${style}|${color}`;
      if (!grouped[gKey]) grouped[gKey] = { style, color, sizes: {} };
      grouped[gKey].sizes[size] = qty;
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => { setDetail(null); setSelectedPL(null); }} className="text-sm text-blue-600 mb-2 inline-block">← All Packing Lists</button>
            <h1 className="text-2xl font-bold">{detail.packingListNo}</h1>
            <p className="text-gray-500 text-sm">{detail.customer?.name} | PO: {detail.po?.poNo}</p>
          </div>
          <button className="btn-primary text-sm" onClick={() => setShowAddCarton(!showAddCarton)}>+ Add Carton</button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="card text-center"><div className="text-xs text-gray-500">Total Cartons</div><div className="text-xl font-bold">{detail.totalCartons}</div></div>
          <div className="card text-center"><div className="text-xs text-gray-500">Total Qty</div><div className="text-xl font-bold">{detail.totalQty?.toLocaleString()}</div></div>
          <div className="card text-center"><div className="text-xs text-gray-500">Gross Wt (kg)</div><div className="text-xl font-bold">{parseFloat(detail.totalGrossWeight || 0).toFixed(1)}</div></div>
          <div className="card text-center"><div className="text-xs text-gray-500">Net Wt (kg)</div><div className="text-xl font-bold">{parseFloat(detail.totalNetWeight || 0).toFixed(1)}</div></div>
          <div className="card text-center"><div className="text-xs text-gray-500">Total CBM</div><div className="text-xl font-bold">{parseFloat(detail.totalCBM || 0).toFixed(3)}</div></div>
        </div>

        {/* Add carton form */}
        {showAddCarton && (
          <form onSubmit={addCarton} className="card mb-6 space-y-3">
            <h3 className="font-semibold">New Carton</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="text-xs text-gray-500">Style# *</label><input name="styleNo" className="input-field" required /></div>
              <div><label className="text-xs text-gray-500">Color *</label><input name="color" className="input-field" required /></div>
              <div><label className="text-xs text-gray-500">Gross Wt (kg)</label><input name="grossWeight" type="number" step="0.1" className="input-field" /></div>
              <div><label className="text-xs text-gray-500">Net Wt (kg)</label><input name="netWeight" type="number" step="0.1" className="input-field" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-gray-500">Length (cm)</label><input name="length" type="number" step="0.1" className="input-field" /></div>
              <div><label className="text-xs text-gray-500">Width (cm)</label><input name="width" type="number" step="0.1" className="input-field" /></div>
              <div><label className="text-xs text-gray-500">Height (cm)</label><input name="height" type="number" step="0.1" className="input-field" /></div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Qty per Size (enter at least one)</label>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map(s => (
                  <div key={s} className="text-center">
                    <div className="text-xs text-gray-400 mb-1">{s}</div>
                    <input name={`qty_${s}`} type="number" min="0" className="input-field w-16 text-center text-sm" placeholder="0" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm">Add Carton</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowAddCarton(false)}>Cancel</button>
            </div>
          </form>
        )}

        {/* Summary by style/color/size */}
        {Object.keys(grouped).length > 0 && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-3">Qty Summary by Style / Color / Size</h3>
            <table className="table-base">
              <thead>
                <tr><th>Style</th><th>Color</th>{SIZES.map(s => <th key={s} className="text-center">{s}</th>)}<th className="text-center">Total</th></tr>
              </thead>
              <tbody>
                {Object.values(grouped).map((g, i) => {
                  const rowTotal = Object.values(g.sizes).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={i}>
                      <td className="font-medium">{g.style}</td>
                      <td>{g.color}</td>
                      {SIZES.map(s => <td key={s} className="text-center">{g.sizes[s] || '—'}</td>)}
                      <td className="text-center font-bold">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Carton list */}
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b bg-gray-50"><h3 className="font-semibold">Cartons ({detail.cartons?.length || 0})</h3></div>
          {detail.cartons?.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No cartons yet. Click "+ Add Carton" above.</p>
          ) : (
            <table className="table-base">
              <thead><tr><th>Ctn#</th><th>Contents</th><th>Pcs</th><th>Gross (kg)</th><th>Net (kg)</th><th>L×W×H (cm)</th><th>CBM</th><th></th></tr></thead>
              <tbody>
                {detail.cartons.map(c => (
                  <tr key={c.id}>
                    <td className="font-bold">{c.cartonNo}</td>
                    <td className="text-sm">
                      {c.lines?.map((l, i) => (
                        <span key={i} className="inline-block bg-gray-100 rounded px-2 py-0.5 mr-1 mb-1 text-xs">
                          {l.styleNo} {l.color} {l.size}×{l.qty}
                        </span>
                      ))}
                    </td>
                    <td className="font-medium">{c.totalPcs}</td>
                    <td>{parseFloat(c.grossWeight).toFixed(1)}</td>
                    <td>{parseFloat(c.netWeight).toFixed(1)}</td>
                    <td className="text-sm">{c.length && c.width && c.height ? `${Number(c.length)}×${Number(c.width)}×${Number(c.height)}` : '—'}</td>
                    <td>{parseFloat(c.cbm).toFixed(4)}</td>
                    <td><button onClick={() => deleteCarton(c.id)} className="text-red-500 hover:text-red-700 text-xs">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <PageHeader title="Packing Lists" subtitle="Cartonization and packing details by PO" />

      <div className="mb-4">
        <button className="btn-primary text-sm" onClick={() => setShowCreate(!showCreate)}>+ New Packing List</button>
      </div>

      {showCreate && (
        <form onSubmit={createPL} className="card mb-6 space-y-3">
          <h3 className="font-semibold">Create Packing List</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Purchase Order *</label>
              <select name="poId" className="select-field" required>
                <option value="">Select PO...</option>
                {pos.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.customer?.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-gray-500">Notes</label><input name="notes" className="input-field" /></div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm">Create</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      {packingLists.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No packing lists yet. Create one above.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="table-base">
            <thead><tr><th>PL#</th><th>Customer</th><th>PO#</th><th>Cartons</th><th>Total Qty</th><th>Gross Wt</th><th>CBM</th><th></th></tr></thead>
            <tbody>
              {packingLists.map(pl => (
                <tr key={pl.id}>
                  <td className="font-medium text-blue-600 cursor-pointer" onClick={() => openDetail(pl)}>{pl.packingListNo}</td>
                  <td>{pl.customer?.name}</td>
                  <td>{pl.po?.poNo}</td>
                  <td>{pl.totalCartons}</td>
                  <td>{pl.totalQty?.toLocaleString()}</td>
                  <td>{parseFloat(pl.totalGrossWeight || 0).toFixed(1)} kg</td>
                  <td>{parseFloat(pl.totalCBM || 0).toFixed(3)} m³</td>
                  <td><button onClick={() => openDetail(pl)} className="text-blue-600 text-sm">Open →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
