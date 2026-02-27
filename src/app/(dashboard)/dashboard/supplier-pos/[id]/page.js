// src/app/(dashboard)/dashboard/supplier-pos/[id]/page.js
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const STATUS_OPTIONS = ['DRAFT','ISSUED','ACKNOWLEDGED','PARTIALLY_RECEIVED','FULLY_RECEIVED','CLOSED','CANCELLED'];
const LOCKED_STATUSES = ['PARTIALLY_RECEIVED','FULLY_RECEIVED','CLOSED'];

function fmt2(n) {
  return parseFloat(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Material type-to-search combobox (reused from new page) ─────────────────
function MaterialCombobox({ value, onChange, materials }) {
  const [query, setQuery]   = useState(value?.name || '');
  const [open, setOpen]     = useState(false);
  const [rect, setRect]     = useState(null);
  const inputRef            = useRef(null);
  const wrapRef             = useRef(null);

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

  useEffect(() => {
    function onMouseDown(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Sync display when value changes externally
  useEffect(() => {
    if (value?.code && value?.name) setQuery(`${value.code} — ${value.name}`);
    else if (value?.name) setQuery(value.name);
  }, [value?.code, value?.name]);

  const dropStyle = rect
    ? { position: 'fixed', top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 320), zIndex: 9999 }
    : {};

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input ref={inputRef} className="input-field" placeholder="Search material..." value={query}
        onFocus={openDropdown} onChange={handleInput}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }} />
      {open && rect && createPortal(
        <ul style={{ ...dropStyle, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto', padding: 0, margin: 0, listStyle: 'none' }}>
          {filtered.length === 0
            ? <li style={{ padding: '8px 12px', color: '#9ca3af', fontSize: 13 }}>No materials found</li>
            : filtered.map(m => (
                <li key={m.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}
                  onMouseDown={() => select(m)}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0f9ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                  <span style={{ fontWeight: 600 }}>{m.code}</span>
                  <span style={{ color: '#6b7280', marginLeft: 8 }}>{m.name}</span>
                </li>
              ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function SupplierPODetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [spo, setSPO]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  // Reference data for dropdowns
  const [suppliers, setSuppliers]           = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [materials, setMaterials]           = useState([]);
  const [poLineItems, setPoLineItems]       = useState({}); // poId → lineItems[]

  // Editable header
  const [hdr, setHdr] = useState({ supplierId: '', customerPOId: '', deliveryDate: '', currency: 'CNY', paymentTerms: '', notes: '', status: '' });
  // Editable line items
  const [lines, setLines] = useState([]);

  // Goods receiving
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [grForm, setGrForm] = useState({ receivedDate: new Date().toISOString().split('T')[0], receivedBy: '', location: '', notes: '' });
  const [grItems, setGrItems] = useState([]);
  const [grSaving, setGrSaving] = useState(false);
  const [grMsg, setGrMsg]       = useState('');

  // Delete SPO
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load SPO + reference data
  useEffect(() => {
    Promise.all([
      fetch(`/api/supplier-pos/${id}`).then(r => r.ok ? r.json() : null),
      fetch('/api/suppliers').then(r => r.json()).catch(() => ({})),
      fetch('/api/purchase-orders').then(r => r.json()).catch(() => ({})),
      fetch('/api/materials').then(r => r.json()).catch(() => ({})),
      fetch('/api/purchase-orders/line-items').then(r => r.json()).catch(() => ({})),
    ]).then(([spoData, supData, poData, matData, liData]) => {
      if (!spoData || spoData?.error) { setSPO(null); return; }
      setSPO(spoData);
      setSuppliers(supData?.suppliers || []);
      setPurchaseOrders(poData?.purchaseOrders || []);
      setMaterials(matData?.materials || []);
      setPoLineItems(liData?.lineItemsByPO || {});

      // Populate editable state
      setHdr({
        supplierId:   spoData.supplierId || '',
        customerPOId: spoData.customerPOId || '',
        deliveryDate: spoData.deliveryDate ? spoData.deliveryDate.split('T')[0] : '',
        currency:     spoData.currency || 'CNY',
        paymentTerms: spoData.paymentTerms || '',
        notes:        spoData.notes || '',
        status:       spoData.status || 'DRAFT',
      });
      setLines((spoData.lineItems || []).map(l => ({
        materialId:    l.materialId || null,
        materialCode:  l.material?.code || '',
        materialName:  l.material?.name || '',
        description:   l.description || '',
        color:         l.color || '',
        quantity:      String(l.quantity ?? ''),
        unit:          l.unit || 'YDS',
        unitPrice:     String(l.unitPrice ?? ''),
        vatRate:       l.vatRate != null ? String(l.vatRate) : '',
        vatRefundable: !!l.vatRefundable,
        poLineItemId:  l.poLineItemId || null,
        poLineInfo:    l.poLineItem ? `${l.poLineItem.po?.poNo} / ${l.poLineItem.style?.styleNo} / ${l.poLineItem.color}` : '',
        notes:         l.notes || '',
      })));
    })
    .catch(() => setSPO(null))
    .finally(() => setLoading(false));
  }, [id]);

  // ── Line item helpers ──
  function addLine() {
    setLines(prev => [...prev, { materialId: null, materialCode: '', materialName: '', description: '', color: '', quantity: '', unit: 'YDS', unitPrice: '', vatRate: '', vatRefundable: false, poLineItemId: null, poLineInfo: '', notes: '' }]);
  }
  function removeLine(idx) { if (lines.length > 1) setLines(prev => prev.filter((_, i) => i !== idx)); }
  function updateLine(idx, field, value) {
    setLines(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  }
  function selectMaterial(idx, mat) {
    if (!mat) { updateLine(idx, 'materialId', null); updateLine(idx, 'description', ''); return; }
    const pref = mat.suppliers?.find(s => s.supplierId === hdr.supplierId && s.isPreferred)
      || mat.suppliers?.find(s => s.isPreferred)
      || mat.suppliers?.[0];
    setLines(prev => {
      const u = [...prev];
      u[idx] = {
        ...u[idx],
        materialId:   mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        description:  mat.name,
        unit:         mat.unitOfMeasure || mat.unit || 'YDS',
        unitPrice:    pref ? String(parseFloat(pref.unitPrice).toFixed(4)) : u[idx].unitPrice,
        vatRate:      mat.vatPercent ? String(parseFloat(mat.vatPercent)) : '',
      };
      return u;
    });
  }

  // ── Line calcs ──
  const lineCalcs = lines.map(l => {
    const gross  = parseFloat(l.quantity || 0) * parseFloat(l.unitPrice || 0);
    const vatPct = parseFloat(l.vatRate || 0);
    const vatAmt = l.vatRefundable ? gross * vatPct / 100 : 0;
    return { gross, vatAmt, netCost: gross - vatAmt };
  });
  const totalGross   = lineCalcs.reduce((s, c) => s + c.gross,   0);
  const totalVAT     = lineCalcs.reduce((s, c) => s + c.vatAmt,  0);
  const totalNetCost = lineCalcs.reduce((s, c) => s + c.netCost, 0);
  const hasVAT       = totalVAT > 0;

  const isLocked = LOCKED_STATUSES.includes(hdr.status);

  // Derive linked customer POs from line items
  const linkedPOIds = [...new Set(lines.map(l => {
    if (!l.poLineItemId) return null;
    for (const [poId, items] of Object.entries(poLineItems)) {
      if (items.some(li => li.id === l.poLineItemId)) return poId;
    }
    return null;
  }).filter(Boolean))];
  const linkedPOs = linkedPOIds.map(id => purchaseOrders.find(p => p.id === id)).filter(Boolean);
  const derivedCustomerPOId = linkedPOIds[0] || hdr.customerPOId || null;

  // ── Save handler ──
  async function handleSave() {
    setSaving(true); setSaveMsg(''); setConfirmSave(false);
    try {
      const complete = lines.filter(l => (l.materialId || l.description) && l.quantity && l.unitPrice);
      if (!complete.length) { setSaveMsg('Add at least one complete line item'); setSaving(false); return; }

      const payload = {
        supplierId:   hdr.supplierId,
        customerPOId: derivedCustomerPOId,
        deliveryDate: hdr.deliveryDate || null,
        currency:     hdr.currency,
        paymentTerms: hdr.paymentTerms || null,
        notes:        hdr.notes || null,
        status:       hdr.status,
        lineItems: complete.map(l => ({
          materialId:    l.materialId || null,
          poLineItemId:  l.poLineItemId || null,
          description:   l.description || '',
          color:         l.color || null,
          quantity:      parseFloat(l.quantity),
          unit:          l.unit,
          unitPrice:     parseFloat(l.unitPrice),
          vatRate:       l.vatRate !== '' && l.vatRate != null ? parseFloat(l.vatRate) : null,
          vatRefundable: !!l.vatRefundable,
          notes:         l.notes || null,
        })),
      };

      const res = await fetch(`/api/supplier-pos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setSPO(prev => ({ ...prev, ...updated }));
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(''), 2500);
      } else {
        const err = await res.json();
        setSaveMsg(err.error || 'Save failed');
      }
    } catch { setSaveMsg('Save failed'); }
    finally { setSaving(false); }
  }

  // ── Status change (quick, no line items) ──
  async function handleStatusChange(newStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/supplier-pos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setHdr(h => ({ ...h, status: newStatus }));
        setSPO(prev => ({ ...prev, status: newStatus }));
      }
    } finally { setSaving(false); }
  }

  // ── Goods receiving ──
  function initReceiveForm() {
    setGrItems((spo?.lineItems || []).map((l, idx) => ({
      spoLineIndex:    idx,
      description:     l.material ? `${l.material.code} — ${l.material.name}` : l.description,
      color:           l.color || '',
      orderedQty:      String(l.quantity ?? ''),
      unit:            l.unit || 'YDS',
      receivedQty:     '',
      actualUnitPrice: String(l.unitPrice ?? ''),
      vatRate:         l.vatRate != null ? parseFloat(l.vatRate) : 0,
      vatRefundable:   !!l.vatRefundable,
      qcResult:        '',
      remarks:         '',
    })));
    setShowReceiveForm(true);
    setGrMsg('');
  }

  function updateGrItem(idx, field, value) {
    setGrItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  }

  async function handleReceiveSubmit() {
    const validItems = grItems.filter(i => parseFloat(i.receivedQty) > 0);
    if (!validItems.length) { setGrMsg('Enter received qty for at least one item'); return; }

    setGrSaving(true); setGrMsg('');
    try {
      const res = await fetch(`/api/supplier-pos/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...grForm,
          items: validItems.map(i => ({
            spoLineIndex:    i.spoLineIndex,
            description:     i.description,
            color:           i.color || null,
            orderedQty:      parseFloat(i.orderedQty || 0),
            receivedQty:     parseFloat(i.receivedQty),
            unit:            i.unit,
            actualUnitPrice: i.actualUnitPrice !== '' ? parseFloat(i.actualUnitPrice) : null,
            qcResult:        i.qcResult || null,
            remarks:         i.remarks || null,
          })),
        }),
      });
      if (res.ok) {
        setGrMsg('Receipt recorded successfully');
        setShowReceiveForm(false);
        // Reload page data safely
        try {
          const freshRes = await fetch(`/api/supplier-pos/${id}`);
          if (freshRes.ok) {
            const fresh = await freshRes.json();
            if (fresh && !fresh.error) {
              setSPO(fresh);
              setHdr(h => ({ ...h, status: fresh.status }));
            }
          }
        } catch { /* Reload failed, data will be stale until page refresh */ }
      } else {
        const err = await res.json().catch(() => ({}));
        setGrMsg(err.error || 'Failed to record receipt');
      }
    } catch { setGrMsg('Failed to record receipt'); }
    finally { setGrSaving(false); }
  }

  // ── Delete SPO ──
  async function handleDeleteSPO() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/supplier-pos/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        // 404 means already deleted — redirect either way
        router.push('/dashboard/supplier-pos');
      } else {
        const err = await res.json();
        setSaveMsg(err.error || 'Failed to delete');
        setConfirmDelete(false);
      }
    } catch { setSaveMsg('Failed to delete'); setConfirmDelete(false); }
    finally { setDeleting(false); }
  }

  // ── Delete individual GR ──
  async function handleDeleteGR(grId) {
    if (!confirm('Delete this goods received record? Related cost records will also be removed.')) return;
    try {
      const res = await fetch(`/api/supplier-pos/${id}/receive/${grId}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        // Reload page data safely
        const freshRes = await fetch(`/api/supplier-pos/${id}`);
        if (!freshRes.ok) { setGrMsg('Deleted. Refresh the page to see changes.'); return; }
        const fresh = await freshRes.json();
        if (!fresh || fresh.error) { setGrMsg('Deleted. Refresh the page to see changes.'); return; }
        setSPO(fresh);
        setHdr(h => ({ ...h, status: fresh.status }));
        // If status went back to ISSUED, unlock lines
        setLines((fresh.lineItems || []).map(l => ({
          materialId:    l.materialId || null,
          materialCode:  l.material?.code || '',
          materialName:  l.material?.name || '',
          description:   l.description || '',
          color:         l.color || '',
          quantity:      String(l.quantity ?? ''),
          unit:          l.unit || 'YDS',
          unitPrice:     String(l.unitPrice ?? ''),
          vatRate:       l.vatRate != null ? String(l.vatRate) : '',
          vatRefundable: !!l.vatRefundable,
          poLineItemId:  l.poLineItemId || null,
          poLineInfo:    l.poLineItem ? `${l.poLineItem.po?.poNo} / ${l.poLineItem.style?.styleNo} / ${l.poLineItem.color}` : '',
          notes:         l.notes || '',
        })));
        setGrMsg('Receipt deleted');
      } else {
        const err = await res.json();
        setGrMsg(err.error || 'Failed to delete receipt');
      }
    } catch { setGrMsg('Failed to delete receipt'); }
  }

  // ── Render ──
  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!spo)    return <div className="text-center py-20 text-red-500">Supplier PO not found</div>;

  return (
    <div>
      <Link href="/dashboard/supplier-pos" className="text-sm text-blue-600 mb-2 inline-block">&larr; Supplier POs</Link>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{spo.spoNo}</h1>
          <p className="text-gray-500 text-sm">{spo.supplier?.name} &bull; {hdr.currency}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input-field" value={hdr.status} onChange={e => handleStatusChange(e.target.value)} disabled={saving}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-500 hover:text-red-700 px-2">Delete</button>
          ) : (
            <div className="flex items-center gap-1">
              <button onClick={handleDeleteSPO} disabled={deleting} className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500 px-2">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Supplier</p>
          <p className="text-lg font-bold">{spo.supplier?.name}</p>
          <p className="text-xs text-gray-400">{spo.supplier?.type?.replace(/_/g, ' ')}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Customer PO</p>
          {spo.customerPO ? (
            <Link href={`/dashboard/purchase-orders/${spo.customerPOId}`} className="text-lg font-bold text-blue-600 hover:text-blue-800">{spo.customerPO.poNo}</Link>
          ) : <p className="text-lg font-bold">—</p>}
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Gross Amount</p>
          <p className="text-lg font-bold">{hdr.currency} {fmt2(totalGross)}</p>
          {hasVAT && <p className="text-xs text-blue-600 font-medium">Net: {hdr.currency} {fmt2(totalNetCost)}</p>}
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Delivery Date</p>
          <p className="text-lg font-bold">{hdr.deliveryDate ? new Date(hdr.deliveryDate).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      {isLocked && (
        <div className="bg-amber-50 text-amber-700 p-3 rounded mb-4 text-sm">
          Line items are locked because goods have been received. You can still change the status.
        </div>
      )}

      {/* ── Editable Header ── */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label">Supplier *</label>
            <select className="input-field" value={hdr.supplierId} onChange={e => setHdr(h => ({ ...h, supplierId: e.target.value }))} disabled={isLocked}>
              <option value="">Select Supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Linked Customer PO {linkedPOs.length > 0 && <span style={{ fontSize: 11, color: '#6b7280' }}>(auto-derived from lines)</span>}</label>
            {linkedPOs.length > 0 ? (
              <div className="input-field" style={{ background: '#f3f4f6', cursor: 'default' }}>
                {linkedPOs.map(po => po.poNo + ' — ' + (po.customer?.name || '')).join(', ')}
              </div>
            ) : (
              <select className="input-field" value={hdr.customerPOId} onChange={e => setHdr(h => ({ ...h, customerPOId: e.target.value }))} disabled={isLocked}>
                <option value="">None (General)</option>
                {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.customer?.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input-field" value={hdr.currency} onChange={e => setHdr(h => ({ ...h, currency: e.target.value }))} disabled={isLocked}>
              {['CNY','USD','VND','BDT','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Delivery Date</label>
            <input type="date" className="input-field" value={hdr.deliveryDate} onChange={e => setHdr(h => ({ ...h, deliveryDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Payment Terms</label>
            <input className="input-field" placeholder="e.g. 30% deposit, 70% before ship" value={hdr.paymentTerms} onChange={e => setHdr(h => ({ ...h, paymentTerms: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input-field" value={hdr.notes} onChange={e => setHdr(h => ({ ...h, notes: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* ── Editable Line Items ── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Line Items</h2>
          {!isLocked && <button type="button" onClick={addLine} className="btn-secondary text-sm">+ Add Line</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="table-base" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>Material</th>
                <th style={{ minWidth: 280 }}>PO / Style-Color</th>
                <th style={{ minWidth: 100 }}>Color</th>
                <th style={{ minWidth: 90 }}>Qty</th>
                <th style={{ minWidth: 75 }}>Unit</th>
                <th style={{ minWidth: 100 }}>Unit Price</th>
                <th style={{ minWidth: 80 }}>VAT %</th>
                <th style={{ minWidth: 60 }}>Refund</th>
                <th style={{ minWidth: 100 }}>Gross</th>
                <th style={{ minWidth: 100 }}>VAT Amt</th>
                <th style={{ minWidth: 100 }}>Net Cost</th>
                {!isLocked && <th></th>}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const { gross, vatAmt, netCost } = lineCalcs[idx];
                return (
                  <tr key={idx}>
                    <td>
                      {isLocked ? (
                        <span>{line.materialCode ? `${line.materialCode} — ${line.materialName}` : line.description}</span>
                      ) : (
                        <MaterialCombobox
                          value={line.materialId ? { id: line.materialId, code: line.materialCode, name: line.materialName || line.description } : null}
                          onChange={mat => selectMaterial(idx, mat)}
                          materials={materials}
                        />
                      )}
                    </td>
                    {/* PO Line Item link */}
                    <td>
                      {isLocked ? (
                        <span style={{ fontSize: 12 }}>{line.poLineInfo || '—'}</span>
                      ) : (
                        <select
                          className="input-field" style={{ width: 170, fontSize: 12 }}
                          value={line.poLineItemId || ''}
                          onChange={e => {
                            const val = e.target.value || null;
                            updateLine(idx, 'poLineItemId', val);
                            // Find display info
                            let info = '';
                            for (const po of purchaseOrders) {
                              const items = poLineItems[po.id] || [];
                              const match = items.find(li => li.id === val);
                              if (match) { info = `${po.poNo} / ${match.style?.styleNo} / ${match.color}`; break; }
                            }
                            updateLine(idx, 'poLineInfo', info);
                          }}
                        >
                          <option value="">— None —</option>
                          {purchaseOrders.map(po => {
                            const items = poLineItems[po.id] || [];
                            return items.map(li => (
                              <option key={li.id} value={li.id}>
                                {po.poNo} / {li.style?.styleNo} / {li.color}
                              </option>
                            ));
                          })}
                        </select>
                      )}
                    </td>
                    <td><input className="input-field" style={{ width: 90 }} value={line.color} onChange={e => updateLine(idx, 'color', e.target.value)} disabled={isLocked} /></td>
                    <td><input type="number" step="0.01" className="input-field" style={{ width: 80 }} value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} disabled={isLocked} /></td>
                    <td>
                      <select className="input-field" style={{ width: 72 }} value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)} disabled={isLocked}>
                        {['YDS','MTR','KG','PCS','GROSS','SET'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td><input type="number" step="0.0001" className="input-field" style={{ width: 90 }} value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} disabled={isLocked} /></td>
                    <td><input type="number" step="0.01" min="0" max="100" className="input-field" style={{ width: 70 }} placeholder="0" value={line.vatRate} onChange={e => updateLine(idx, 'vatRate', e.target.value)} disabled={isLocked} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!line.vatRefundable} onChange={e => updateLine(idx, 'vatRefundable', e.target.checked)}
                        disabled={isLocked || !line.vatRate || parseFloat(line.vatRate) === 0} />
                    </td>
                    <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>{gross > 0 ? fmt2(gross) : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', color: vatAmt > 0 ? '#16a34a' : '#9ca3af' }}>{vatAmt > 0 ? fmt2(vatAmt) : '—'}</td>
                    <td className="font-semibold" style={{ whiteSpace: 'nowrap', color: vatAmt > 0 ? '#1d4ed8' : undefined }}>{gross > 0 ? fmt2(netCost) : '—'}</td>
                    {!isLocked && (
                      <td>{lines.length > 1 && <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold" style={{ borderTop: '2px solid #e5e7eb' }}>
                <td colSpan={8} className="text-right">Total ({hdr.currency}):</td>
                <td style={{ whiteSpace: 'nowrap' }}>{fmt2(totalGross)}</td>
                <td style={{ whiteSpace: 'nowrap', color: totalVAT > 0 ? '#16a34a' : '#9ca3af' }}>{totalVAT > 0 ? fmt2(totalVAT) : '—'}</td>
                <td style={{ whiteSpace: 'nowrap', color: totalVAT > 0 ? '#1d4ed8' : undefined }}>{fmt2(totalNetCost)}</td>
                {!isLocked && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Save Button ── */}
      {!isLocked && (
        <div className="flex items-center gap-3 mb-6">
          {!confirmSave ? (
            <button onClick={() => setConfirmSave(true)} disabled={saving} className="btn-primary">Save Changes</button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary bg-amber-600 hover:bg-amber-700">
                {saving ? 'Saving…' : '✓ Confirm Save'}
              </button>
              <button onClick={() => setConfirmSave(false)} disabled={saving} className="btn-secondary">Cancel</button>
            </>
          )}
          {saveMsg && <span className={`text-sm font-medium ${saveMsg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg}</span>}
        </div>
      )}

      {/* ── Goods Receiving Section ── */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Goods Received ({spo.goodsReceived?.length || 0})</h2>
          {!showReceiveForm && (
            <button type="button" onClick={initReceiveForm} className="btn-primary text-sm">Record Receipt</button>
          )}
        </div>

        {grMsg && <div className={`p-3 rounded mb-4 text-sm ${grMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{grMsg}</div>}

        {/* Receive Form */}
        {showReceiveForm && (
          <div className="border border-blue-200 bg-blue-50/30 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-3">New Receipt</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="label">Received Date</label>
                <input type="date" className="input-field" value={grForm.receivedDate} onChange={e => setGrForm(f => ({ ...f, receivedDate: e.target.value }))} />
              </div>
              <div>
                <label className="label">Received By</label>
                <input className="input-field" value={grForm.receivedBy} onChange={e => setGrForm(f => ({ ...f, receivedBy: e.target.value }))} />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input-field" placeholder="Warehouse" value={grForm.location} onChange={e => setGrForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input-field" value={grForm.notes} onChange={e => setGrForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table-base" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Material / Description</th>
                    <th>Color</th>
                    <th>Ordered</th>
                    <th>Received Qty *</th>
                    <th>Actual Unit Price</th>
                    <th>Gross Total</th>
                    <th style={{ background: '#f0fdf4', color: '#15803d' }}>VAT Rate</th>
                    <th style={{ background: '#f0fdf4', color: '#15803d' }}>VAT Refund</th>
                    <th style={{ background: '#eff6ff', color: '#1d4ed8' }}>Net to P&L</th>
                    <th>QC Result</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {grItems.map((item, idx) => {
                    const gross    = (parseFloat(item.receivedQty) || 0) * (parseFloat(item.actualUnitPrice) || 0);
                    const vatRate  = item.vatRate || 0;
                    const vatRefund = item.vatRefundable && vatRate > 0 ? gross * vatRate / 100 : 0;
                    const netCost  = gross - vatRefund;
                    return (
                      <tr key={idx}>
                        <td className="font-medium">{item.description}</td>
                        <td>{item.color || '—'}</td>
                        <td>{item.orderedQty} {item.unit}</td>
                        <td>
                          <input type="number" step="0.01" className="input-field" style={{ width: 90 }}
                            value={item.receivedQty} onChange={e => updateGrItem(idx, 'receivedQty', e.target.value)} />
                        </td>
                        <td>
                          <input type="number" step="0.0001" className="input-field" style={{ width: 100 }}
                            value={item.actualUnitPrice} onChange={e => updateGrItem(idx, 'actualUnitPrice', e.target.value)} />
                        </td>
                        <td className="font-medium" style={{ whiteSpace: 'nowrap', color: gross > 0 ? '#374151' : '#9ca3af' }}>
                          {gross > 0 ? fmt2(gross) : '—'}
                        </td>
                        {/* VAT columns */}
                        <td style={{ background: '#f0fdf4', whiteSpace: 'nowrap', color: '#15803d' }}>
                          {vatRate > 0 ? (
                            <span title={item.vatRefundable ? 'Refundable' : 'Not refundable'}>
                              {vatRate}%{item.vatRefundable ? ' ✓' : ' ✗'}
                            </span>
                          ) : <span style={{ color: '#9ca3af' }}>—</span>}
                        </td>
                        <td style={{ background: '#f0fdf4', whiteSpace: 'nowrap', color: vatRefund > 0 ? '#15803d' : '#9ca3af', fontWeight: vatRefund > 0 ? 600 : 400 }}>
                          {vatRefund > 0 ? fmt2(vatRefund) : '—'}
                        </td>
                        <td style={{ background: '#eff6ff', whiteSpace: 'nowrap', color: '#1d4ed8', fontWeight: 700 }}>
                          {gross > 0 ? fmt2(netCost) : '—'}
                        </td>
                        <td>
                          <select className="input-field" style={{ width: 100 }} value={item.qcResult} onChange={e => updateGrItem(idx, 'qcResult', e.target.value)}>
                            <option value="">—</option>
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                            <option value="CONDITIONAL">CONDITIONAL</option>
                          </select>
                        </td>
                        <td><input className="input-field" style={{ width: 120 }} value={item.remarks} onChange={e => updateGrItem(idx, 'remarks', e.target.value)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const totGross  = grItems.reduce((s, i) => {
                      return s + (parseFloat(i.receivedQty) || 0) * (parseFloat(i.actualUnitPrice) || 0);
                    }, 0);
                    const totVAT    = grItems.reduce((s, i) => {
                      const g = (parseFloat(i.receivedQty) || 0) * (parseFloat(i.actualUnitPrice) || 0);
                      return s + (i.vatRefundable && i.vatRate > 0 ? g * i.vatRate / 100 : 0);
                    }, 0);
                    const totNet    = totGross - totVAT;
                    const variance  = totGross - totalGross;
                    return (
                      <tr className="font-semibold" style={{ borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={5} className="text-right text-gray-500 text-xs" style={{ lineHeight: '2rem' }}>
                          Gross total ({hdr.currency}):
                          {totVAT > 0 && <><br /><span style={{ color: '#15803d' }}>VAT refund:</span><br /><span style={{ color: '#1d4ed8' }}>Net cost to P&L:</span></>}
                        </td>
                        <td className="font-bold" style={{ color: '#374151', verticalAlign: 'top', paddingTop: '0.5rem' }}>
                          {fmt2(totGross)}
                          {totVAT > 0 && (
                            <>
                              <br /><span style={{ color: '#15803d' }}>− {fmt2(totVAT)}</span>
                              <br /><span style={{ color: '#1d4ed8' }}>{fmt2(totNet)}</span>
                            </>
                          )}
                        </td>
                        <td colSpan={2} style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>
                          {totGross > 0 && (
                            <span style={{ fontSize: 12, color: variance > 0 ? '#dc2626' : variance < 0 ? '#16a34a' : '#6b7280' }}>
                              {variance > 0 ? '+' : ''}{fmt2(variance)} vs PO
                            </span>
                          )}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={handleReceiveSubmit} disabled={grSaving} className="btn-primary">
                {grSaving ? 'Saving…' : 'Submit Receipt'}
              </button>
              <button onClick={() => setShowReceiveForm(false)} disabled={grSaving} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {/* Existing receipts history */}
        {!spo.goodsReceived?.length && !showReceiveForm ? (
          <p className="text-sm text-gray-400">No goods received yet</p>
        ) : (
          <div className="space-y-3">
            {spo.goodsReceived?.map(gr => (
              <div key={gr.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Received {new Date(gr.receivedDate).toLocaleDateString()}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{gr.receivedBy ? `by ${gr.receivedBy}` : ''} {gr.location ? `@ ${gr.location}` : ''}</span>
                    <button onClick={() => handleDeleteGR(gr.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
                {gr.items?.map(item => (
                  <div key={item.id} className="text-xs text-gray-600 flex justify-between py-0.5">
                    <span>{item.description} {item.color ? `(${item.color})` : ''}</span>
                    <span>
                      {parseFloat(item.receivedQty).toLocaleString()} / {parseFloat(item.orderedQty).toLocaleString()} {item.unit}
                      {item.actualUnitPrice != null && (
                        <span className="text-blue-600 ml-2">@ {fmt2(item.actualUnitPrice)} = {fmt2(item.actualLineTotal)}</span>
                      )}
                      {item.qcResult && <span className={`ml-1 ${item.qcResult === 'PASS' ? 'text-green-600' : item.qcResult === 'FAIL' ? 'text-red-600' : 'text-yellow-600'}`}>[{item.qcResult}]</span>}
                    </span>
                  </div>
                ))}
                {gr.notes && <p className="text-xs text-gray-400 mt-1">{gr.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
