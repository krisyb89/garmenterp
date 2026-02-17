// src/app/(dashboard)/dashboard/supplier-pos/new/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSupplierPOPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [form, setForm] = useState({
    supplierId: '',
    customerPOId: '',
    deliveryDate: '',
    currency: 'CNY',
    paymentTerms: '',
    notes: '',
  });
  const [lines, setLines] = useState([{ description: '', color: '', quantity: '', unit: 'YDS', unitPrice: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/purchase-orders').then(r => r.json()),
    ]).then(([supData, poData]) => {
      setSuppliers(supData.suppliers || []);
      setPurchaseOrders(poData.purchaseOrders || []);
    });
  }, []);

  function addLine() {
    setLines([...lines, { description: '', color: '', quantity: '', unit: 'YDS', unitPrice: '' }]);
  }

  function removeLine(idx) {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx, field, value) {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  }

  const totalAmount = lines.reduce((sum, l) => sum + (parseFloat(l.quantity || 0) * parseFloat(l.unitPrice || 0)), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.supplierId) { setError('Please select a supplier'); return; }
    if (!lines.some(l => l.description && l.quantity && l.unitPrice)) { setError('Add at least one complete line item'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        customerPOId: form.customerPOId || null,
        lineItems: lines
          .filter(l => l.description && l.quantity && l.unitPrice)
          .map(l => ({
            description: l.description,
            color: l.color || null,
            quantity: parseFloat(l.quantity),
            unit: l.unit,
            unitPrice: parseFloat(l.unitPrice),
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
        const err = await res.json();
        setError(err.error || 'Failed to create');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Link href="/dashboard/supplier-pos" className="text-sm text-blue-600 mb-2 inline-block">&larr; Supplier POs</Link>
      <h1 className="text-2xl font-bold mb-6">New Supplier Purchase Order</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Supplier *</label>
              <select className="input-field" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} required>
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.type?.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Linked Customer PO</label>
              <select className="input-field" value={form.customerPOId} onChange={e => setForm({ ...form, customerPOId: e.target.value })}>
                <option value="">None (General)</option>
                {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.poNo} — {po.customer?.name}</option>)}
              </select>
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
            <table className="table-base">
              <thead>
                <tr>
                  <th>Description *</th>
                  <th>Color</th>
                  <th>Quantity *</th>
                  <th>Unit</th>
                  <th>Unit Price *</th>
                  <th>Line Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const lineTotal = parseFloat(line.quantity || 0) * parseFloat(line.unitPrice || 0);
                  return (
                    <tr key={idx}>
                      <td><input className="input-field" placeholder="Material / service" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                      <td><input className="input-field" style={{ width: '100px' }} value={line.color} onChange={e => updateLine(idx, 'color', e.target.value)} /></td>
                      <td><input type="number" step="0.01" className="input-field" style={{ width: '100px' }} value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                      <td>
                        <select className="input-field" style={{ width: '80px' }} value={line.unit} onChange={e => updateLine(idx, 'unit', e.target.value)}>
                          <option value="YDS">YDS</option>
                          <option value="MTR">MTR</option>
                          <option value="KG">KG</option>
                          <option value="PCS">PCS</option>
                          <option value="GROSS">GROSS</option>
                          <option value="SET">SET</option>
                        </select>
                      </td>
                      <td><input type="number" step="0.01" className="input-field" style={{ width: '100px' }} value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', e.target.value)} /></td>
                      <td className="font-medium">{lineTotal > 0 ? lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}</td>
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
                <tr className="font-semibold">
                  <td colSpan={5} className="text-right">Grand Total:</td>
                  <td>{form.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
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
