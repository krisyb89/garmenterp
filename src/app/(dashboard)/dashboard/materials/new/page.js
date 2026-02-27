// src/app/(dashboard)/dashboard/materials/new/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';

const TYPE_PRESETS = ['FABRIC', 'TRIM', 'PACKING'];

export default function NewMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

  useEffect(() => {
    // Load categories
    fetch('/api/material-categories')
      .then(r => r.json())
      .then(d => {
        let cats = d.categories || [];
        // Ensure FABRIC, TRIM, PACKING exist; create if missing
        const existing = cats.map(c => c.name);
        const missing = TYPE_PRESETS.filter(t => !existing.includes(t));
        if (missing.length > 0) {
          Promise.all(missing.map(name =>
            fetch('/api/material-categories', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            }).then(r => r.json())
          )).then(newCats => {
            setCategories([...cats, ...newCats.filter(c => c.id)]);
          });
        } else {
          setCategories(cats);
        }
      })
      .catch(() => setCategories([]));

    // Load suppliers
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(d => setSuppliers(d.suppliers || []))
      .catch(() => setSuppliers([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd);

    // Parse numerics
    data.moq = data.moq ? parseFloat(data.moq) : null;
    data.leadTimeDays = data.leadTimeDays ? parseInt(data.leadTimeDays) : null;
    data.widthMeters = data.widthMeters ? parseFloat(data.widthMeters) : null;
    data.gsm = data.gsm ? parseInt(data.gsm) : null;
    data.pricePerUnit = data.pricePerUnit ? parseFloat(data.pricePerUnit) : null;
    data.vatPercent = data.vatPercent ? parseFloat(data.vatPercent) : 0;
    data.supplierPrice = data.supplierPrice ? parseFloat(data.supplierPrice) : null;

    try {
      const res = await fetch('/api/materials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/materials');
    } catch { setError('Failed'); } finally { setLoading(false); }
  }

  // Track which category is selected to show relevant category name
  function handleCategoryChange(e) {
    const cat = categories.find(c => c.id === e.target.value);
    setSelectedCategoryName(cat?.name || '');
  }

  const isFabric = selectedCategoryName === 'FABRIC';

  return (
    <div>
      <PageHeader title="New Material" />
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-4">

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Code *</label>
            <input name="code" className="input-field" required placeholder="FAB-001" />
          </div>
          <div>
            <label className="label-field">Name *</label>
            <input name="name" className="input-field" required />
          </div>
          <div>
            <label className="label-field">Type *</label>
            <select name="categoryId" className="select-field" required onChange={handleCategoryChange}>
              <option value="">Select type…</option>
              {categories
                .sort((a, b) => TYPE_PRESETS.indexOf(a.name) - TYPE_PRESETS.indexOf(b.name) || a.name.localeCompare(b.name))
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              }
            </select>
          </div>
        </div>

        <div>
          <label className="label-field">Description</label>
          <input name="description" className="input-field" />
        </div>

        {/* Fabric-specific */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Content / Composition</label>
            <input name="content" className="input-field" placeholder="100% Cotton" />
          </div>
          <div>
            <label className="label-field">Width (meters)</label>
            <input name="widthMeters" type="number" step="0.0001" className="input-field" placeholder="1.50" />
          </div>
          <div>
            <label className="label-field">GSM</label>
            <input name="gsm" type="number" className="input-field" placeholder="180" />
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="label-field">Price / Unit</label>
            <input name="pricePerUnit" type="number" step="0.0001" className="input-field" placeholder="0" />
          </div>
          <div>
            <label className="label-field">Unit</label>
            <select name="unit" className="select-field" defaultValue="METER">
              <option value="METER">Meter</option>
              <option value="YARD">Yard</option>
              <option value="KG">KG</option>
              <option value="PCS">PCS</option>
            </select>
          </div>
          <div>
            <label className="label-field">VAT %</label>
            <input name="vatPercent" type="number" step="0.01" className="input-field" defaultValue="13" />
          </div>
          <div>
            <label className="label-field">Lead Time (days)</label>
            <input name="leadTimeDays" type="number" className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-field">MOQ</label>
            <input name="moq" type="number" className="input-field" />
          </div>
          <div>
            <label className="label-field">Notes</label>
            <input name="notes" className="input-field" />
          </div>
        </div>

        {/* Supplier Linking */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-sm text-gray-700 mb-3">🏭 Link to Supplier (optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label-field">Supplier</label>
              <select name="supplierId" className="select-field">
                <option value="">No supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Supplier Price</label>
              <input name="supplierPrice" type="number" step="0.0001" className="input-field" placeholder="Price from this supplier" />
            </div>
            <div>
              <label className="label-field">Currency</label>
              <select name="supplierCurrency" className="select-field" defaultValue="CNY">
                {['CNY','USD','EUR','GBP','VND','BDT'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating…' : 'Create Material'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
