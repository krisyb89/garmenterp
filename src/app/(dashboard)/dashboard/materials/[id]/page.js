// src/app/(dashboard)/dashboard/materials/[id]/page.js
'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MaterialDetailPage() {
  const { id } = useParams();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/materials/${id}`).then(r => r.json()),
      fetch('/api/material-categories').then(r => r.json()).catch(() => ({ categories: [] })),
    ]).then(([matData, catData]) => {
      setMaterial(matData);
      setCategories(catData.categories || []);
      setForm({
        name: matData.name || '',
        code: matData.code || '',
        categoryId: matData.categoryId || '',
        description: matData.description || '',
        content: matData.content || '',
        widthMeters: matData.widthMeters ?? '',
        gsm: matData.gsm ?? '',
        pricePerUnit: matData.pricePerUnit ?? '',
        unit: matData.unit || 'METER',
        vatPercent: matData.vatPercent ?? 0,
        composition: matData.composition || '',
        weight: matData.weight || '',
        width: matData.width || '',
        unitOfMeasure: matData.unitOfMeasure || 'MTR',
        moq: matData.moq ?? '',
        leadTimeDays: matData.leadTimeDays ?? '',
        notes: matData.notes || '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const data = { ...form };
      // Convert numeric fields
      if (data.pricePerUnit !== '') data.pricePerUnit = parseFloat(data.pricePerUnit);
      else data.pricePerUnit = null;
      if (data.widthMeters !== '') data.widthMeters = parseFloat(data.widthMeters);
      else data.widthMeters = null;
      if (data.gsm !== '') data.gsm = parseInt(data.gsm);
      else data.gsm = null;
      if (data.vatPercent !== '') data.vatPercent = parseFloat(data.vatPercent);
      if (data.moq !== '') data.moq = parseFloat(data.moq);
      else data.moq = null;
      if (data.leadTimeDays !== '') data.leadTimeDays = parseInt(data.leadTimeDays);
      else data.leadTimeDays = null;

      const res = await fetch(`/api/materials/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setMaterial({ ...material, ...updated });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!material) return <div className="text-center py-20 text-red-500">Material not found</div>;

  return (
    <div>
      <Link href="/dashboard/materials" className="text-sm text-blue-600 mb-2 inline-block">&larr; Materials</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{material.code} — {material.name}</h1>
          <p className="text-gray-500 text-sm">{material.category?.name || 'Uncategorized'} &bull; {material.unit}</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-primary">Edit Material</button>
        )}
      </div>

      {editing ? (
        <div className="card">
          <h2 className="font-semibold mb-4">Edit Material</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Code</label>
              <input className="input-field" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Description</label>
              <input className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Content / Composition</label>
              <input className="input-field" placeholder="e.g. 100% Cotton" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <div>
              <label className="label">Width (meters)</label>
              <input type="number" step="0.01" className="input-field" value={form.widthMeters} onChange={e => setForm({ ...form, widthMeters: e.target.value })} />
            </div>
            <div>
              <label className="label">GSM</label>
              <input type="number" className="input-field" value={form.gsm} onChange={e => setForm({ ...form, gsm: e.target.value })} />
            </div>
            <div>
              <label className="label">Price Per Unit</label>
              <input type="number" step="0.01" className="input-field" value={form.pricePerUnit} onChange={e => setForm({ ...form, pricePerUnit: e.target.value })} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input-field" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="METER">Meter</option>
                <option value="YARD">Yard</option>
                <option value="KG">KG</option>
                <option value="PCS">PCS</option>
              </select>
            </div>
            <div>
              <label className="label">VAT %</label>
              <input type="number" step="0.1" className="input-field" value={form.vatPercent} onChange={e => setForm({ ...form, vatPercent: e.target.value })} />
            </div>
            <div>
              <label className="label">MOQ</label>
              <input type="number" className="input-field" value={form.moq} onChange={e => setForm({ ...form, moq: e.target.value })} />
            </div>
            <div>
              <label className="label">Lead Time (days)</label>
              <input type="number" className="input-field" value={form.leadTimeDays} onChange={e => setForm({ ...form, leadTimeDays: e.target.value })} />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h2 className="font-semibold mb-3">Specifications</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Content</dt><dd>{material.content || material.composition || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Width</dt><dd>{material.widthMeters ? `${material.widthMeters}m` : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">GSM</dt><dd>{material.gsm || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Description</dt><dd className="text-right max-w-xs">{material.description || '—'}</dd></div>
              </dl>
            </div>
            <div className="card">
              <h2 className="font-semibold mb-3">Pricing</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Price/Unit</dt><dd>{material.pricePerUnit != null ? Number(material.pricePerUnit).toFixed(2) : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Unit</dt><dd>{material.unit}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Price/Meter</dt><dd>{material.pricePerMeter != null ? Number(material.pricePerMeter).toFixed(4) : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">VAT %</dt><dd>{Number(material.vatPercent || 0).toFixed(1)}%</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">MOQ</dt><dd>{material.moq || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Lead Time</dt><dd>{material.leadTimeDays ? `${material.leadTimeDays} days` : '—'}</dd></div>
              </dl>
            </div>
            <div className="card">
              <h2 className="font-semibold mb-3">Suppliers ({material.suppliers?.length || 0})</h2>
              {!material.suppliers?.length ? (
                <p className="text-sm text-gray-400">No suppliers linked</p>
              ) : (
                <div className="space-y-2">
                  {material.suppliers.map(ms => (
                    <div key={ms.id} className="flex justify-between text-sm py-1 border-b border-gray-50">
                      <Link href={`/dashboard/suppliers/${ms.supplier?.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {ms.supplier?.name}
                      </Link>
                      <span>{ms.currency} {parseFloat(ms.unitPrice).toFixed(2)}/{ms.isPreferred ? ' (Preferred)' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BOM Usage */}
          {material.bomItems?.length > 0 && (
            <div className="card mt-6">
              <h2 className="font-semibold mb-3">Used in Styles ({material.bomItems.length})</h2>
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr><th>Style</th><th>Placement</th><th>Consumption</th><th>Unit</th><th>Wastage %</th></tr></thead>
                  <tbody>
                    {material.bomItems.map(bom => (
                      <tr key={bom.id}>
                        <td>
                          <Link href={`/dashboard/styles/${bom.style?.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {bom.style?.styleNo}
                          </Link>
                        </td>
                        <td>{bom.placement || '—'}</td>
                        <td>{parseFloat(bom.consumptionQty).toFixed(4)}</td>
                        <td>{bom.consumptionUnit}</td>
                        <td>{parseFloat(bom.wastagePercent).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {material.notes && (
            <div className="card mt-6">
              <h2 className="font-semibold mb-2">Notes</h2>
              <p className="text-sm text-gray-600">{material.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
