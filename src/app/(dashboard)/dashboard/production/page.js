// src/app/(dashboard)/dashboard/production/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

// ── Simple Combobox ──────────────────────────────────────────────
function Combobox({ value, onSelect, options, placeholder, disabled }) {
  // options: [{ value, label }]
  const [query, setQuery]       = useState('');
  const [open,  setOpen]        = useState(false);
  const ref                     = useRef(null);

  // Sync display text only when the selected value changes (not on every options re-render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const match = options.find(o => o.value === value);
    setQuery(match ? match.label : '');
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        className="input-field"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(''); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
          {filtered.map(o => (
            <li key={o.value}
              onMouseDown={e => { e.preventDefault(); onSelect(o.value); setQuery(o.label); setOpen(false); }}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer">
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  poId: '', factoryId: '', styleNo: '', color: '', totalQty: '',
  targetStartDate: '', targetEndDate: '', cmtRate: '', cmtCurrency: 'USD', notes: '',
};

export default function ProductionPage() {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Create modal
  const [showCreate,  setShowCreate]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [createMsg,   setCreateMsg]   = useState('');
  const [poList,      setPoList]      = useState([]);
  const [factoryList, setFactoryList] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/production-orders?${params}`)
      .then(r => r.json())
      .then(d => setOrders(d.productionOrders || []))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      fetch('/api/purchase-orders').then(r => r.json()),
      fetch('/api/factories').then(r => r.json()),
    ]).then(([poData, facData]) => {
      setPoList(poData.purchaseOrders || poData || []);
      setFactoryList(facData.factories || facData || []);
    });
  }, [showCreate]);

  // ── Derived options from selected PO ──
  const selectedPO = poList.find(p => p.id === form.poId);

  const styleOptions = selectedPO
    ? [...new Set(selectedPO.lineItems.map(l => l.style?.styleNo).filter(Boolean))]
        .map(s => ({ value: s, label: s }))
    : [];

  const colorOptions = selectedPO
    ? [...new Set(
        selectedPO.lineItems
          .filter(l => !form.styleNo || l.style?.styleNo === form.styleNo)
          .map(l => l.color)
          .filter(Boolean)
      )].map(c => ({ value: c, label: c }))
    : [];

  const poOptions     = poList.map(p => ({ value: p.id, label: `${p.poNo}${p.customer?.name ? ' · ' + p.customer.name : ''}` }));
  const factoryOptions = factoryList.map(f => ({ value: f.id, label: `${f.name} (${f.country})` }));

  function sf(field) { return val => setForm(f => ({ ...f, [field]: val })); }
  function sfE(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.poId || !form.factoryId || !form.styleNo || !form.totalQty) {
      setCreateMsg('PO, Factory, Style and Total Qty are required');
      return;
    }
    setSaving(true); setCreateMsg('');
    try {
      const res = await fetch('/api/production-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          totalQty:        parseInt(form.totalQty),
          cmtRate:         form.cmtRate ? parseFloat(form.cmtRate) : null,
          targetStartDate: form.targetStartDate || null,
          targetEndDate:   form.targetEndDate || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(prev => [data, ...prev]);
        setShowCreate(false);
        setForm(EMPTY_FORM);
      } else {
        setCreateMsg(data.error || 'Failed to create production order');
      }
    } catch { setCreateMsg('Failed to create production order'); }
    finally { setSaving(false); }
  }

  const columns = [
    { key: 'prodOrderNo', label: 'Prod Order#', isLink: true },
    { key: 'po',          label: 'PO#',      render: r => r.po?.poNo },
    { key: 'customer',    label: 'Customer',  render: r => r.po?.customer?.name },
    { key: 'styleNo',     label: 'Style' },
    { key: 'color',       label: 'Color' },
    { key: 'totalQty',    label: 'Qty',       render: r => r.totalQty?.toLocaleString() },
    { key: 'factory',     label: 'Factory',   render: r => `${r.factory?.name} (${r.factory?.country})` },
    { key: 'inHouse',     label: 'Type',      render: r => r.factory?.isInHouse ? '🏠 In-House' : '🏭 External' },
    { key: 'status',      label: 'Status',    render: r => <StatusBadge status={r.status} /> },
  ];

  const statuses = ['', 'PLANNED', 'MATERIAL_ISSUED', 'CUTTING', 'SEWING', 'WASHING_FINISHING', 'QC_INSPECTION', 'PACKING', 'READY_TO_SHIP', 'COMPLETED'];

  return (
    <div>
      <PageHeader title="Production Orders" subtitle="Track manufacturing across all factories" />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowCreate(true); setCreateMsg(''); setForm(EMPTY_FORM); }}
          className="btn-primary text-sm">
          + New Production Order
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={orders} linkPrefix="/dashboard/production" />}

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">New Production Order</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleCreate} className="p-4 space-y-3">

              {/* PO combobox */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer PO *</label>
                <Combobox
                  value={form.poId}
                  onSelect={val => setForm(f => ({ ...f, poId: val, styleNo: '', color: '' }))}
                  options={poOptions}
                  placeholder="Search PO# or customer…"
                />
              </div>

              {/* Factory combobox */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Factory *</label>
                <Combobox
                  value={form.factoryId}
                  onSelect={sf('factoryId')}
                  options={factoryOptions}
                  placeholder="Search factory…"
                />
              </div>

              {/* Style + Color from PO line items */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Style *</label>
                  <Combobox
                    value={form.styleNo}
                    onSelect={val => setForm(f => ({ ...f, styleNo: val, color: '' }))}
                    options={styleOptions}
                    placeholder={form.poId ? 'Pick style…' : 'Select PO first'}
                    disabled={!form.poId}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <Combobox
                    value={form.color}
                    onSelect={val => {
                      const lineItem = selectedPO?.lineItems.find(
                        l => l.style?.styleNo === form.styleNo && l.color === val
                      );
                      setForm(f => ({
                        ...f,
                        color:    val,
                        totalQty: lineItem?.totalQty != null ? String(lineItem.totalQty) : f.totalQty,
                      }));
                    }}
                    options={colorOptions}
                    placeholder={form.styleNo ? 'Pick color…' : 'Pick style first'}
                    disabled={!form.styleNo}
                  />
                </div>
              </div>

              {/* Total Qty */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Total Qty *
                  {form.totalQty && <span className="ml-1 font-normal text-gray-400">(from PO — edit if partial)</span>}
                </label>
                <input type="number" min="1" value={form.totalQty} onChange={sfE('totalQty')} placeholder="0" className="input-field" required />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target Start</label>
                  <input type="date" value={form.targetStartDate} onChange={sfE('targetStartDate')} className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target End</label>
                  <input type="date" value={form.targetEndDate} onChange={sfE('targetEndDate')} className="input-field" />
                </div>
              </div>

              {/* CMT Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CMT Rate</label>
                  <input type="number" step="0.01" min="0" value={form.cmtRate} onChange={sfE('cmtRate')} placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CMT Currency</label>
                  <select value={form.cmtCurrency} onChange={sfE('cmtCurrency')} className="input-field">
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={sfE('notes')} rows={2} className="input-field resize-none" placeholder="Any additional notes…" />
              </div>

              {createMsg && <p className="text-xs text-red-500">{createMsg}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? 'Creating…' : 'Create Production Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
