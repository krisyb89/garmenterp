// src/app/(dashboard)/dashboard/supplier-pos/new/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Material type-to-search combobox ──────────────────────────────────────────
function MaterialCombobox({ value, onChange, materials, supplierId }) {
  const [query, setQuery]   = useState(value?.name || '');
  const [open, setOpen]     = useState(false);
  const [rect, setRect]     = useState(null);
  const inputRef            = useRef(null);
  const wrapRef             = useRef(null);

  // Filter by query
  const filtered = materials.filter(m => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  }).slice(0, 20);

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  function handleInput(e) {
    setQuery(e.target.value);
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
    if (!e.target.value.trim()) onChange(null);
  }

  function select(mat) {
    setQuery(`${mat.code} — ${mat.name}`);
    setOpen(false);
    onChange(mat);
  }

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const dropStyle = rect
    ? { position: 'fixed', top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 320), zIndex: 9999 }
    : {};

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="input-field"
        placeholder="Search material..."
        value={query}
        onFocus={openDropdown}
        onChange={handleInput}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
      />
      {open && rect && createPortal(
        <ul style={{ ...dropStyle, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto', padding: 0, margin: 0, listStyle: 'none' }}>
          {filtered.length === 0
            ? <li style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 13 }}>No materials found</li>
            : filtered.map(m => {
                // Find preferred supplier price
                const pref = m.suppliers?.find(s => s.isPreferred) || m.suppliers?.[0];
                const price = pref ? parseFloat(pref.unitPrice).toFixed(2) : null;
                return (
                  <li
                    key={m.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}
                    onMouseDown={() => select(m)}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >
                    <span style={{ fontWeight: 600 }}>{m.code}</span>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>{m.name}</span>
                    {price && <span style={{ float: 'right', color: '#16a34a', fontWeight: 500 }}>{pref?.currency || 'CNY'} {price}/{m.unitOfMeasure || m.unit}</span>}
                  </li>
                );
              })
          }
        </ul>,
        document.body
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewSupplierPOPage() {
  const router = useRouter();
  const [suppliers,      setSuppliers]      = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [materials,      setMaterials]      = useState([]);
  const [form, setForm] = useState({
    supplierId:    '',
    customerPOId:  '',
    deliveryDate:  '',
    currency:      'CNY',
    paymentTerms:  '',
    notes:         '',
  });
  const [lines, setLines] = useState([
    { materialId: null, description: '', color: '', quantity: '', unit: 'YDS', unitPrice: '', vatRate: '', vatRefundable: false, poLineItemId: null },
  ]);
  // PO line items for linking (loaded when user selects a PO per line)
  const [poLineItems, setPoLineItems] = useState({}); // poId → lineItems[]
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/purchase-orders').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/materials').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/purchase-orders/line-items').then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ]).then(([supData, poData, matData, liData]) => {
      setSuppliers(supData?.suppliers || []);
      setPurchaseOrders(poData?.purchaseOrders || []);
      setMaterials(matData?.materials || []);
      setPoLineItems(liData?.lineItemsByPO || {});
    }).catch(err => console.error('[NewSPO] load error:', err));
  }, []);

  // Load PO line items when needed for linking
  async function loadPOLineItems(poId) {
    if (!poId || poLineItems[poId]) return;
    try {
      const res = await fetch(`/api/purchase-orders/${poId}?lineItemsOnly=true`);
      const data = await res.json();
      setPoLineItems(prev => ({ ...prev, [poId]: data.lineItems || [] }));
    } catch {}
  }

  function addLine() {
    setLines(prev => [...prev, { materialId: null, description: '', color: '', quantity: '', unit: 'YDS', unitPrice: '', vatRate: '', vatRefundable: false, poLineItemId: null }]);
  }

  function removeLine(idx) {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx, field, value) {
    setLines(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function selectMaterial(idx, mat) {
    if (!mat) {
      // Cleared
      updateLine(idx, 'materialId',   null);
      updateLine(idx, 'description',  '');
      updateLine(idx, 'unit',         'YDS');
      updateLine(idx, 'vatRate',      '');
      return;
    }
    // Find preferred supplier price
    const pref = mat.suppliers?.find(s => {
      if (form.supplierId) return s.supplierId === form.supplierId;
      return s.isPreferred;
    }) || mat.suppliers?.find(s => s.isPreferred) || mat.suppliers?.[0];

    setLines(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        materialId:  mat.id,
        description: mat.name,
        unit:        mat.unitOfMeasure || mat.unit || 'YDS',
        unitPrice:   pref ? String(parseFloat(pref.unitPrice).toFixed(4)) : updated[idx].unitPrice,
        vatRate:     mat.vatPercent ? String(parseFloat(mat.vatPercent)) : '',
      };
      return updated;
    });
  }

  // Compute per-line totals and VAT
  const lineCalcs = lines.map(l => {
    const gross     = parseFloat(l.quantity || 0) * parseFloat(l.unitPrice || 0);
    const vatPct    = parseFloat(l.vatRate || 0);
    const vatAmt    = l.vatRefundable ? gross * vatPct / 100 : 0;
    const netCost   = gross - vatAmt;
    return { gross, vatAmt, netCost };
  });

  const totalGross   = lineCalcs.reduce((s, c) => s + c.gross,   0);
  const totalVAT     = lineCalcs.reduce((s, c) => s + c.vatAmt,  0);
  const totalNetCost = lineCalcs.reduce((s, c) => s + c.netCost, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplierId) { setError('Please select a supplier'); return; }
    const complete = lines.filter(l => (l.materialId || l.description) && l.quantity && l.unitPrice);
    if (!complete.length) { setError('Add at least one complete line item'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        customerPOId: derivedCustomerPOId || null,
        lineItems: complete.map(l => ({
          materialId:    l.materialId   || null,
          poLineItemId:  l.poLineItemId || null,
          description:   l.description  || '',
          color:         l.color        || null,
          quantity:      parseFloat(l.quantity),
          unit:          l.unit,
          unitPrice:     parseFloat(l.unitPrice),
          vatRate:       l.vatRate !== '' && l.vatRate != null ? parseFloat(l.vatRate) : null,
          vatRefundable: !!l.vatRefundable,
        })),
      };
      const res = await fetch('/api/supplier-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/supplier-pos/${data.id}`);
      } else {
        let msg = `Server error (${res.status})`;
        try { const err = await res.json(); msg = err.error || msg; } catch {}
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasVAT = lines.some(l => l.vatRate && parseFloat(l.vatRate) > 0);

  // Derive linked customer POs from line items automatically
  const linkedPOIds = [...new Set(lines.map(l => {
    if (!l.poLineItemId) return null;
    // Find which PO owns this line item
    for (const [poId, items] of Object.entries(poLineItems)) {
      if (items.some(li => li.id === l.poLineItemId)) return poId;
    }
    return null;
  }).filter(Boolean))];
  const linkedPOs = linkedPOIds.map(id => purchaseOrders.find(p => p.id === id)).filter(Boolean);

  // Auto-set customerPOId from line items (first linked PO as primary)
  const derivedCustomerPOId = linkedPOIds[0] || form.customerPOId || null;

  return (
    <div>
      <Link href="/dashboard/supplier-pos" className="text-sm text-blue-600 mb-2 inline-block">&larr; Supplier POs</Link>
      <h1 className="text-2xl font-bold mb-6">New Supplier Purchase Order</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Supplier *</label>
              <select className="input-field" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} required>
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.type?.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Linked Customer PO {linkedPOs.length > 0 && <span style={{ fontSize: 11, color: '#6b7280' }}>(auto-derived from lines)</span>}</label>
              {linkedPOs.length > 0 ? (
                <div className="input-field" style={{ background: '#f3f4f6', cursor: 'default' }}>
                  {linkedPOs.map(po => po.poNo + ' — ' + (po.customer?.name || '')).join(', ')}
                </div>
              ) : (
                <select className="input-field" value={form.customerPOId} onChange={e => setForm({ ...form, customerPOId: e.target.value })}>
                  <option value="">None (General)</option>
                  {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.customer?.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input-field" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
                <option value="VND">VND</option>
                <option value="BDT">BDT</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="label">Delivery Date</label>
              <input type="date" className="input-field" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <input className="input-field" placeholder="e.g. 30% deposit, 70% before ship" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input-field" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Line Items</h2>
            <button type="button" onClick={addLine} className="btn-secondary text-sm">+ Add Line</button>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Material *</th>
                  <th style={{ minWidth: 180 }}>Link to PO / Style-Color</th>
                  <th style={{ minWidth: 100 }}>Color</th>
                  <th style={{ minWidth: 90 }}>Qty *</th>
                  <th style={{ minWidth: 75 }}>Unit</th>
                  <th style={{ minWidth: 100 }}>Unit Price *</th>
                  <th style={{ minWidth: 80 }}>VAT %</th>
                  <th style={{ minWidth: 90 }}>Refundable</th>
                  <th style={{ minWidth: 100 }}>Gross Total</th>
                  <th style={{ minWidth: 100 }}>VAT Amt</th>
                  <th style={{ minWidth: 100 }}>Net Cost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const { gross, vatAmt, netCost } = lineCalcs[idx];
                  return (
                    <tr key={idx}>
                      <td>
                        <MaterialCombobox
                          value={line.materialId ? { id: line.materialId, name: line.description } : null}
                          onChange={mat => selectMaterial(idx, mat)}
                          materials={materials}
                          supplierId={form.supplierId}
                        />
                      </td>
                      {/* Link to PO Line Item */}
                      <td>
                        <select
                          className="input-field" style={{ width: 170, fontSize: 12 }}
                          value={line.poLineItemId || ''}
                          onChange={e => updateLine(idx, 'poLineItemId', e.target.value || null)}
                        >
                          <option value="">— None —</option>
                          {purchaseOrders.map(po => {
                            const items = poLineItems[po.id] || [];
                            if (!items.length) {
                              return (
                                <option key={po.id} value="" disabled onClick={() => loadPOLineItems(po.id)}>
                                  {po.poNo} (loading...)
                                </option>
                              );
                            }
                            return items.map(li => (
                              <option key={li.id} value={li.id}>
                                {po.poNo} / {li.style?.styleNo} / {li.color}
                              </option>
                            ));
                          })}
                        </select>
                        {!Object.keys(poLineItems).length && purchaseOrders.length > 0 && (
                          <button type="button" className="text-xs text-blue-500 mt-1" onClick={() => purchaseOrders.forEach(po => loadPOLineItems(po.id))}>
                            Load PO lines
                          </button>
                        )}
                      </td>
                      <td>
                        <input className="input-field" style={{ width: 90 }} value={line.color} onChange={e => updateLine(idx, 'color', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" step="0.01" className="input-field" style={{ width: 80 }} value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} />
                      </td>
                      <td>
                        <select className="input-field" style={{ width: 72 }} value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)}>
                          <option value="YDS">YDS</option>
                          <option value="MTR">MTR</option>
                          <option value="KG">KG</option>
                          <option value="PCS">PCS</option>
                          <option value="GROSS">GROSS</option>
                          <option value="SET">SET</option>
                        </select>
                      </td>
                      <td>
                        <input type="number" step="0.0001" className="input-field" style={{ width: 90 }} value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} />
                      </td>
                      {/* VAT % */}
                      <td>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          className="input-field" style={{ width: 70 }}
                          placeholder="0"
                          value={line.vatRate}
                          onChange={e => updateLine(idx, 'vatRate', e.target.value)}
                        />
                      </td>
                      {/* Refundable checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!line.vatRefundable}
                          onChange={e => updateLine(idx, 'vatRefundable', e.target.checked)}
                          disabled={!line.vatRate || parseFloat(line.vatRate) === 0}
                          title="Check if VAT is refundable (deducted from P&L cost)"
                        />
                      </td>
                      {/* Gross total */}
                      <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>
                        {gross > 0 ? gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>
                      {/* VAT amount */}
                      <td style={{ whiteSpace: 'nowrap', color: vatAmt > 0 ? '#16a34a' : '#9ca3af' }}>
                        {vatAmt > 0 ? vatAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>
                      {/* Net cost */}
                      <td className="font-semibold" style={{ whiteSpace: 'nowrap', color: vatAmt > 0 ? '#1d4ed8' : undefined }}>
                        {gross > 0 ? netCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>
                      <td>
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold" style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td colSpan={8} className="text-right">Grand Total ({form.currency}):</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ whiteSpace: 'nowrap', color: totalVAT > 0 ? '#16a34a' : '#9ca3af' }}>
                    {totalVAT > 0 ? totalVAT.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: totalVAT > 0 ? '#1d4ed8' : undefined }}>
                    {totalNetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
                {totalVAT > 0 && (
                  <tr>
                    <td colSpan={12} style={{ fontSize: 12, color: '#6b7280', paddingTop: 4 }}>
                      * Net Cost = Gross Total {'\u2212'} refundable VAT. Used for P&amp;L costing.
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Supplier PO'}</button>
          <Link href="/dashboard/supplier-pos" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
