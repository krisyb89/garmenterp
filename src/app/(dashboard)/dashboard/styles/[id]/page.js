// src/app/(dashboard)/dashboard/styles/[id]/page.js
'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import MaterialSearchInput from '@/components/MaterialSearchInput';

// ── Section definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  { key: 'FABRIC',  label: 'Fabric',  category: 'FABRIC',  defaultUnit: 'MTR' },
  { key: 'TRIM',    label: 'Trim',    category: 'TRIM',    defaultUnit: 'PCS' },
  { key: 'PACKING', label: 'Packing', category: 'PACKING', defaultUnit: 'PCS' },
];

const UNITS = ['MTR', 'YDS', 'KG', 'PCS', 'GROSS', 'SET', 'ROLL'];

// Derive section from material category name
function sectionFromCategoryName(name) {
  if (!name) return 'TRIM';
  const n = name.toUpperCase();
  if (n.includes('FABRIC')) return 'FABRIC';
  if (n.includes('PACK'))   return 'PACKING';
  return 'TRIM';
}

function tempId() { return `_new_${Date.now()}_${Math.random()}`; }

function blankRow(section) {
  const sec = SECTIONS.find(s => s.key === section) || SECTIONS[1];
  return {
    _id: tempId(), id: null, materialId: null, name: '',
    section, placement: '',
    consumptionQty: '', consumptionUnit: sec.defaultUnit,
    wastagePercent: 3, notes: '',
  };
}

function rowFromItem(b) {
  return {
    _id: b.id,
    id:  b.id,
    materialId:      b.materialId,
    name:            b.material?.name || b.description || '',
    section:         sectionFromCategoryName(b.material?.category?.name),
    placement:       b.placement || '',
    consumptionQty:  parseFloat(b.consumptionQty) || '',
    consumptionUnit: b.consumptionUnit || 'MTR',
    wastagePercent:  parseFloat(b.wastagePercent) ?? 3,
    notes:           b.notes || '',
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StyleDetailPage() {
  const { id } = useParams();
  const [style, setStyle] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Detail editing state ────────────────────────────────────────────────
  const [detailForm, setDetailForm] = useState(null);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailSaved, setDetailSaved] = useState(false);
  const [detailError, setDetailError] = useState('');

  // ── BOM state ────────────────────────────────────────────────────────────
  const [bomRows, setBomRows] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [bomSaving, setBomSaving] = useState(false);
  const [bomSaved, setBomSaved] = useState(false);
  const [bomError, setBomError] = useState('');

  useEffect(() => {
    fetch(`/api/styles/${id}`)
      .then(r => r.json())
      .then(data => {
        setStyle(data);
        setBomRows((data.bomItems || []).map(rowFromItem));
        setDetailForm({
          category:     data.category     || '',
          construction: data.construction || '',
          fitType:      data.fitType      || '',
          description:  data.description  || '',
          season:       data.season       || '',
          notes:        data.notes        || '',
          cnHsCode:                   data.cnHsCode                   || '',
          usHsCode:                   data.usHsCode                   || '',
          customsDeclarationElements: data.customsDeclarationElements || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ── Save Details ─────────────────────────────────────────────────────────
  async function saveDetails() {
    setDetailSaving(true);
    setDetailError('');
    try {
      const res = await fetch(`/api/styles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailForm),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setStyle(prev => ({ ...prev, ...updated }));
      setDetailSaved(true);
      setTimeout(() => setDetailSaved(false), 3000);
    } catch {
      setDetailError('Failed to save.');
    } finally {
      setDetailSaving(false);
    }
  }

  function addRow(section) { setBomRows(prev => [...prev, blankRow(section)]); }

  function updateRow(idx, patch) {
    setBomRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeRow(idx) {
    const row = bomRows[idx];
    if (row.id) setRemovedIds(prev => [...prev, row.id]);
    setBomRows(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveBOM() {
    const invalid = bomRows.filter(r => !r.materialId);
    if (invalid.length) { setBomError('All rows must have a material selected.'); return; }
    setBomError('');
    setBomSaving(true);
    try {
      await Promise.all(removedIds.map(bid =>
        fetch(`/api/styles/${id}/bom/${bid}`, { method: 'DELETE' })
      ));
      setRemovedIds([]);

      const results = await Promise.all(bomRows.map(row => {
        const payload = {
          materialId:      row.materialId,
          description:     row.name,
          placement:       row.placement,
          consumptionQty:  parseFloat(row.consumptionQty) || 0,
          consumptionUnit: row.consumptionUnit,
          wastagePercent:  parseFloat(row.wastagePercent) || 0,
          notes:           row.notes,
        };
        if (row.id) {
          return fetch(`/api/styles/${id}/bom/${row.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          }).then(r => r.json());
        } else {
          return fetch(`/api/styles/${id}/bom`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          }).then(r => r.json());
        }
      }));

      setBomRows(results.map(rowFromItem));
      setBomSaved(true);
      setTimeout(() => setBomSaved(false), 3000);
    } catch {
      setBomError('Failed to save BOM.');
    } finally {
      setBomSaving(false);
    }
  }

  const totalItems = bomRows.length;

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!style)  return <div className="text-center py-20 text-red-500">Style not found</div>;

  return (
    <div>
      <Link href="/dashboard/styles" className="text-sm text-blue-600 mb-2 inline-block">← Styles</Link>
      <h1 className="text-2xl font-bold mb-1">{style.styleNo}</h1>
      <p className="text-gray-500 text-sm mb-6">{style.customer?.name} • {style.category || 'No category'} • {style.season || ''}</p>

      {/* Details + PO Lines */}
      {detailForm && (() => {
        const styleImage = (Array.isArray(style.imageUrls) ? style.imageUrls[0] : null) || style.imageUrl || null;
        const df = (field) => (e) => setDetailForm(prev => ({ ...prev, [field]: e.target.value }));
        return (
          <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div className="card">
              {/* Top row: square thumbnail + style number */}
              <div className="flex items-start gap-4 mb-4">
                {/* Square thumbnail */}
                <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  {styleImage
                    ? <img src={styleImage} alt={style.styleNo} className="w-full h-full object-contain bg-gray-100" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  }
                </div>
                {/* Style number + customer */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-xl font-bold leading-tight truncate">{style.styleNo}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{style.customer?.name}</p>
                </div>
                {/* Save button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {detailError && <span className="text-red-500 text-xs">{detailError}</span>}
                  {detailSaved && <span className="text-green-600 text-xs font-medium">✓ Saved</span>}
                  <button type="button" onClick={saveDetails} disabled={detailSaving}
                    className="btn-primary text-xs">
                    {detailSaving ? 'Saving…' : 'Save Details'}
                  </button>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Category</label>
                    <input className="input-field text-sm w-full" value={detailForm.category}
                      placeholder="Tops, Bottoms…" onChange={df('category')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Season</label>
                    <input className="input-field text-sm w-full" value={detailForm.season}
                      placeholder="SS25, FW25…" onChange={df('season')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Construction</label>
                    <input className="input-field text-sm w-full" value={detailForm.construction}
                      placeholder="Woven, Knit, Denim…" onChange={df('construction')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fit Type</label>
                    <input className="input-field text-sm w-full" value={detailForm.fitType}
                      placeholder="Slim, Regular, Relaxed…" onChange={df('fitType')} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea className="input-field text-sm w-full" rows={2} value={detailForm.description}
                    placeholder="Style description…" onChange={df('description')} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea className="input-field text-sm w-full" rows={2} value={detailForm.notes}
                    placeholder="Additional notes…" onChange={df('notes')} />
                </div>
                {/* Customs / Compliance */}
                <div className="border-t border-gray-100 pt-3 mt-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customs / Compliance</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">China HS Code</label>
                      <input className="input-field text-sm w-full" value={detailForm.cnHsCode}
                        placeholder="e.g. 6109909050" onChange={df('cnHsCode')} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">US HTS Code</label>
                      <input className="input-field text-sm w-full" value={detailForm.usHsCode}
                        placeholder="e.g. 6109.10.0012" onChange={df('usHsCode')} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">海关申报要素</label>
                    <textarea className="input-field text-sm w-full font-mono" rows={2}
                      value={detailForm.customsDeclarationElements}
                      placeholder="e.g. 品名|材质|用途|…"
                      onChange={df('customsDeclarationElements')} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-3">PO Lines</h2>
              {!style.poLines?.length ? <p className="text-sm text-gray-400">Not on any POs</p> :
                <div className="space-y-2">{style.poLines.map(pl => (
                  <Link key={pl.id} href={`/dashboard/purchase-orders/${pl.po?.id}`}
                    className="flex justify-between text-sm py-1 hover:bg-gray-50 rounded">
                    <span className="text-blue-600">{pl.po?.poNo}</span>
                    <StatusBadge status={pl.po?.status} />
                  </Link>
                ))}</div>}
            </div>
          </div>
        );
      })()}

      {/* ── BOM Editor ───────────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Bill of Materials ({totalItems} items)</h2>
          <div className="flex items-center gap-3">
            {bomError && <span className="text-red-600 text-xs">{bomError}</span>}
            {bomSaved && <span className="text-green-600 text-sm font-medium">✓ BOM saved</span>}
            <button type="button" className="btn-primary text-xs" onClick={saveBOM} disabled={bomSaving}>
              {bomSaving ? 'Saving…' : 'Save BOM'}
            </button>
          </div>
        </div>

        {/* Table header — shared across all sections */}
        <div className="overflow-x-auto mt-4 border rounded-lg">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-3 py-2 min-w-[220px]">Material</th>
                <th className="text-left px-3 py-2 min-w-[140px]">Placement</th>
                <th className="text-left px-3 py-2 w-24">Qty</th>
                <th className="text-left px-3 py-2 w-24">Unit</th>
                <th className="text-left px-3 py-2 w-24">Wastage %</th>
                <th className="text-left px-3 py-2 min-w-[140px]">Notes</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>

            {SECTIONS.map(sec => {
              const sectionRows = bomRows
                .map((r, globalIdx) => ({ r, globalIdx }))
                .filter(({ r }) => r.section === sec.key);

              return (
                <tbody key={sec.key}>
                  {/* Section header row */}
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <td colSpan={7} className="px-3 py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {sec.label}
                          <span className="ml-1.5 font-normal text-gray-400">({sectionRows.length})</span>
                        </span>
                        <button type="button"
                          onClick={() => addRow(sec.key)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          + Add {sec.label}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Section rows */}
                  {sectionRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-3 text-xs text-gray-400 text-center italic">
                        No {sec.label.toLowerCase()} items — click + Add {sec.label}
                      </td>
                    </tr>
                  ) : sectionRows.map(({ r: row, globalIdx }) => (
                    <tr key={row._id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 ${!row.materialId ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-2 py-1.5">
                        <MaterialSearchInput
                          category={sec.category}
                          line={{ name: row.name }}
                          onSelect={mat => updateRow(globalIdx, {
                            materialId: mat.materialId,
                            name: mat.name || '',
                          })}
                        />
                        {!row.materialId && (
                          <span className="text-xs text-amber-600">Select a material</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input-field text-xs" value={row.placement}
                          placeholder="e.g. Body, Collar…"
                          onChange={e => updateRow(globalIdx, { placement: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.0001" min="0" className="input-field text-xs"
                          value={row.consumptionQty} placeholder="0"
                          onChange={e => updateRow(globalIdx, { consumptionQty: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="select-field text-xs" value={row.consumptionUnit}
                          onChange={e => updateRow(globalIdx, { consumptionUnit: e.target.value })}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.1" min="0" max="100" className="input-field text-xs"
                          value={row.wastagePercent}
                          onChange={e => updateRow(globalIdx, { wastagePercent: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input-field text-xs" value={row.notes}
                          placeholder="Notes…"
                          onChange={e => updateRow(globalIdx, { notes: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" onClick={() => removeRow(globalIdx)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>

    </div>
  );
}
