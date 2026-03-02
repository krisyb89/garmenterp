// src/components/MaterialSearchInput.js
// Searchable material typeahead for the costing page.
// Shows results from the correct category, autofills pricing, and
// lets the user create a new material via modal if nothing matches.
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/* ─────────────────────────────────────────────
   Main typeahead component
   ───────────────────────────────────────────── */
export default function MaterialSearchInput({ category, line, onSelect }) {
  const [query, setQuery] = useState(line?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [isMounted, setIsMounted] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Mark as mounted on client (avoids SSR/CSR mismatch)
  useEffect(() => { setIsMounted(true); }, []);

  // Sync query when line.name changes from outside (e.g., clear)
  useEffect(() => { setQuery(line?.name || ''); }, [line?.name]);

  // Calculate fixed dropdown position from input's bounding rect
  function calcDropdownStyle() {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 9999,
    });
  }

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const p = new URLSearchParams({ search: query });
        if (category) p.set('category', category);
        const res = await fetch(`/api/materials?${p}`);
        const data = await res.json();
        setResults(data.materials || []);
        calcDropdownStyle();
        setOpen(true);
      } catch {} finally { setSearching(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [query, category]);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', () => setOpen(false), true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', () => setOpen(false), true);
    };
  }, []);

  function handleSelect(mat) {
    setQuery(mat.name);
    setOpen(false);
    // Use pricePerMeter if available (computed for METER/YARD/KG units),
    // fall back to pricePerUnit for PCS or any unit without a meter conversion
    const price = mat.pricePerMeter != null ? Number(mat.pricePerMeter)
                : mat.pricePerUnit  != null ? Number(mat.pricePerUnit)
                : null;
    onSelect({
      materialId: mat.id,
      name: mat.name,
      vatPercent: mat.vatPercent != null ? Number(mat.vatPercent) : 0,
      unitPriceLocal: price,
      unitPricePerMeter: price,
    });
  }

  function handleCreated(mat) {
    setShowModal(false);
    handleSelect(mat);
  }

  const dropdown = open ? (
    <div style={dropdownStyle} className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
      {searching && (
        <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
      )}
      {!searching && results.length === 0 && (
        <div className="px-3 py-2 text-xs text-gray-400">No {category?.toLowerCase() || 'material'} found for "{query}"</div>
      )}
      {results.map(m => (
        <button key={m.id} type="button" onMouseDown={() => handleSelect(m)}
          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
          <div className="flex flex-col">
            <span className="font-medium text-gray-800">{m.name}</span>
            <span className="text-gray-400">{m.code}{m.content ? ` · ${m.content}` : ''}</span>
          </div>
          {m.pricePerMeter != null && (
            <span className="text-xs font-mono text-gray-500 flex-shrink-0">
              {Number(m.pricePerMeter).toFixed(4)}/m
            </span>
          )}
        </button>
      ))}
      <button type="button" onMouseDown={() => { setOpen(false); setShowModal(true); }}
        className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 font-medium border-t flex items-center gap-1">
        <span>＋</span> Add New Material
      </button>
    </div>
  ) : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        ref={inputRef}
        className="input-field text-xs"
        value={query}
        placeholder={`Search ${(category || 'material').toLowerCase()}…`}
        onChange={e => { setQuery(e.target.value); if (!e.target.value) onSelect({ materialId: null, name: '' }); }}
        onFocus={() => { if (query) { calcDropdownStyle(); setOpen(true); } }}
        autoComplete="off"
      />

      {isMounted && createPortal(dropdown, document.body)}

      {showModal && (
        <AddMaterialModal
          defaultCategory={category}
          defaultName={query}
          onClose={() => setShowModal(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Add Material Modal
   ───────────────────────────────────────────── */
function AddMaterialModal({ defaultCategory, defaultName, onClose, onCreate }) {
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: defaultName || '',
    code: '',
    categoryId: '',
    pricePerUnit: '',
    unit: 'METER',
    vatPercent: '13',
    content: '',
    supplierId: '',
    supplierPrice: '',
    supplierCurrency: 'CNY',
  });

  useEffect(() => {
    fetch('/api/material-categories').then(r => r.json()).then(d => {
      const cats = d.categories || [];
      setCategories(cats);
      // Auto-select the category matching defaultCategory
      if (defaultCategory) {
        const match = cats.find(c => c.name === defaultCategory);
        if (match) setForm(prev => ({ ...prev, categoryId: match.id }));
      }
    });
    fetch('/api/suppliers').then(r => r.json()).then(d => setSuppliers(d.suppliers || []));
  }, [defaultCategory]);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name || !form.categoryId) { setError('Name and type are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        pricePerUnit: form.pricePerUnit ? parseFloat(form.pricePerUnit) : null,
        vatPercent: form.vatPercent ? parseFloat(form.vatPercent) : 0,
        supplierPrice: form.supplierPrice ? parseFloat(form.supplierPrice) : null,
      };
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create'); return; }
      // POST response already includes pricePerMeter (computed on save)
      onCreate(data);
    } catch { setError('Failed to create material'); }
    finally { setSaving(false); }
  }

  // Suggest a code from the name
  useEffect(() => {
    if (form.name && !form.code) {
      const prefix = defaultCategory ? defaultCategory.slice(0, 3) : 'MAT';
      const slug = form.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4);
      set('code', `${prefix}-${slug}`);
    }
  }, [form.name]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Add New Material</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Name *</label>
              <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="label-field">Code *</label>
              <input className="input-field font-mono" value={form.code} onChange={e => set('code', e.target.value)} required placeholder="FAB-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Type *</label>
              <select className="select-field" value={form.categoryId} onChange={e => set('categoryId', e.target.value)} required>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Content</label>
              <input className="input-field" value={form.content} onChange={e => set('content', e.target.value)} placeholder="100% Cotton" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Price/Unit</label>
              <input type="number" step="0.0001" className="input-field" value={form.pricePerUnit} onChange={e => set('pricePerUnit', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label-field">Unit</label>
              <select className="select-field" value={form.unit} onChange={e => set('unit', e.target.value)}>
                <option value="METER">Meter</option>
                <option value="YARD">Yard</option>
                <option value="KG">KG</option>
                <option value="PCS">PCS</option>
              </select>
            </div>
            <div>
              <label className="label-field">VAT %</label>
              <input type="number" step="0.01" className="input-field" value={form.vatPercent} onChange={e => set('vatPercent', e.target.value)} />
            </div>
          </div>

          {/* Supplier */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">🏭 Link to Supplier (optional)</p>
            <div className={`grid gap-3 ${form.supplierId ? 'grid-cols-3' : 'grid-cols-1'}`}>
              <div>
                <label className="label-field">Supplier</label>
                <select className="select-field" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                  <option value="">No supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {form.supplierId && (<>
                <div>
                  <label className="label-field">Supplier Price</label>
                  <input type="number" step="0.0001" className="input-field" value={form.supplierPrice} onChange={e => set('supplierPrice', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="label-field">Currency</label>
                  <select className="select-field" value={form.supplierCurrency} onChange={e => set('supplierCurrency', e.target.value)}>
                    {['CNY','USD','EUR','GBP','VND','BDT'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>)}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create & Use'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
