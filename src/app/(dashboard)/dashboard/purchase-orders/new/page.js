// src/app/(dashboard)/dashboard/purchase-orders/new/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ShippingOrdersEditor from '@/components/ShippingOrdersEditor';

const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'];

export default function NewPOPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [styles, setStyles] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(d.customers || []));
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetch(`/api/styles?customerId=${selectedCustomerId}`).then(r => r.json()).then(d => setStyles(d.styles || []));
    }
  }, [selectedCustomerId]);

  function addLineItem() {
    setLineItems(prev => [...prev, {
      styleId: '', color: '', colorCode: '', unitPrice: '',
      sizeBreakdown: DEFAULT_SIZES.reduce((acc, s) => ({ ...acc, [s]: '' }), {}),
      shippingOrders: [],
      deliveryDate: '', notes: '',
      _newSize: '',
    }]);
  }

  function updateLineItem(index, field, value) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function updateSizeQty(index, size, qty) {
    setLineItems(prev => prev.map((item, i) =>
      i === index ? { ...item, sizeBreakdown: { ...item.sizeBreakdown, [size]: qty } } : item
    ));
  }

  function addSize(index, sizeName) {
    const name = (sizeName || '').trim().toUpperCase();
    if (!name) return;
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (name in item.sizeBreakdown) return { ...item, _newSize: '' }; // already exists
      return { ...item, sizeBreakdown: { ...item.sizeBreakdown, [name]: '' }, _newSize: '' };
    }));
  }

  function removeSize(index, size) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const { [size]: _removed, ...rest } = item.sizeBreakdown;
      return { ...item, sizeBreakdown: rest };
    }));
  }

  function removeLineItem(index) {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  }

  function getLineTotal(line) {
    const qty = Object.values(line.sizeBreakdown).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
    return { qty, amount: qty * (parseFloat(line.unitPrice) || 0) };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const data = {
      poNo: formData.get('poNo'),
      customerId: selectedCustomerId,
      orderDate: formData.get('orderDate'),
      shipByDate: formData.get('shipByDate') || null,
      cancelDate: formData.get('cancelDate') || null,
      shippingTerms: formData.get('shippingTerms'),
      portOfLoading: formData.get('portOfLoading'),
      portOfDischarge: formData.get('portOfDischarge'),
      currency: formData.get('currency'),
      store: formData.get('store') || null,
      brand: formData.get('brand') || null,
      specialInstructions: formData.get('specialInstructions'),
      notes: formData.get('notes'),
      // Explicit mapping — excludes _newSize and other UI-only fields
      lineItems: lineItems.map(l => ({
        styleId:        l.styleId,
        color:          l.color,
        colorCode:      l.colorCode,
        unitPrice:      parseFloat(l.unitPrice) || 0,
        deliveryDate:   l.deliveryDate || null,
        notes:          l.notes || null,
        shippingOrders: l.shippingOrders || [],
        sizeBreakdown:  Object.fromEntries(
          Object.entries(l.sizeBreakdown)
            .filter(([_, v]) => parseInt(v) > 0)
            .map(([k, v]) => [k, parseInt(v)])
        ),
      })),
    };

    try {
      const res = await fetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) { setError(result.error); return; }
      router.push('/dashboard/purchase-orders');
    } catch { setError('Failed to create PO'); } finally { setLoading(false); }
  }

  const grandTotal = lineItems.reduce((acc, l) => {
    const { qty, amount } = getLineTotal(l);
    return { qty: acc.qty + qty, amount: acc.amount + amount };
  }, { qty: 0, amount: 0 });

  return (
    <div>
      <PageHeader title="New Purchase Order" />
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PO Header */}
        <div className="card">
          <h2 className="font-semibold mb-4">PO Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">PO# *</label>
              <input name="poNo" className="input-field" required placeholder="e.g., NK-PO-2025-001" />
            </div>
            <div>
              <label className="label-field">Customer *</label>
              <select name="customerId" className="select-field" required value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                <option value="">Select...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Order Date *</label>
              <input name="orderDate" type="date" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label-field">Ship By Date</label>
              <input name="shipByDate" type="date" className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="label-field">Cancel Date</label>
              <input name="cancelDate" type="date" className="input-field" />
            </div>
            <div>
              <label className="label-field">Shipping Terms</label>
              <select name="shippingTerms" className="select-field" defaultValue="FOB">
                <option value="FOB">FOB</option><option value="CIF">CIF</option>
                <option value="DDP">DDP</option><option value="EXW">EXW</option>
              </select>
            </div>
            <div>
              <label className="label-field">Port of Loading</label>
              <input name="portOfLoading" className="input-field" placeholder="e.g., Shanghai" />
            </div>
            <div>
              <label className="label-field">Port of Discharge</label>
              <input name="portOfDischarge" className="input-field" placeholder="e.g., Los Angeles" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="label-field">Currency</label>
              <select name="currency" className="select-field" defaultValue="USD">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="label-field">Store</label>
              <input name="store" className="input-field" placeholder="e.g., Nike.com, Nordstrom" />
            </div>
            <div>
              <label className="label-field">Brand</label>
              <input name="brand" className="input-field" placeholder="e.g., Nike, Jordan" />
            </div>
            <div>
              <label className="label-field">Special Instructions</label>
              <input name="specialInstructions" className="input-field" />
            </div>
          </div>
          <div className="mt-4">
            <label className="label-field">Notes</label>
            <textarea name="notes" className="input-field" rows={2} />
          </div>
        </div>

        {/* Line Items with Size-Color Matrix */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Line Items (Size-Color Matrix)</h2>
            <button type="button" className="btn-primary text-xs" onClick={addLineItem}>+ Add Line</button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No line items yet. Click "+ Add Line" to add styles.</p>
          ) : (
            <div className="space-y-6">
              {lineItems.map((line, idx) => {
                const { qty, amount } = getLineTotal(line);
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 relative">
                    <button type="button" onClick={() => removeLineItem(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 text-sm">✕ Remove</button>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="label-field">Style *</label>
                        <select className="select-field" value={line.styleId} onChange={e => updateLineItem(idx, 'styleId', e.target.value)} required>
                          <option value="">Select style...</option>
                          {styles.map(s => <option key={s.id} value={s.id}>{s.styleNo} - {s.description || s.category || ''}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label-field">Color *</label>
                        <input className="input-field" value={line.color} onChange={e => updateLineItem(idx, 'color', e.target.value)} required placeholder="e.g., Navy" />
                      </div>
                      <div>
                        <label className="label-field">Color Code</label>
                        <input className="input-field" value={line.colorCode} onChange={e => updateLineItem(idx, 'colorCode', e.target.value)} placeholder="e.g., C001" />
                      </div>
                      <div>
                        <label className="label-field">Unit Price *</label>
                        <input type="number" step="0.01" className="input-field" value={line.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)} required />
                      </div>
                    </div>

                    {/* Size breakdown — fully customizable */}
                    <div className="mb-2">
                      <label className="label-field">Size Breakdown</label>
                      <div className="flex gap-2 flex-wrap items-end mt-1">

                        {/* Existing sizes — each with a × to remove */}
                        {Object.keys(line.sizeBreakdown).map(size => (
                          <div key={size} className="text-center">
                            <div className="flex items-center justify-center gap-0.5 mb-1">
                              <span className="text-xs text-gray-500">{size}</span>
                              <button
                                type="button"
                                onClick={() => removeSize(idx, size)}
                                className="text-red-300 hover:text-red-500 text-xs font-bold leading-none"
                                title={`Remove ${size}`}
                              >×</button>
                            </div>
                            <input
                              type="number" min="0"
                              className="input-field w-20 text-center text-sm"
                              value={line.sizeBreakdown[size] || ''}
                              onChange={e => updateSizeQty(idx, size, e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        ))}

                        {/* Add size input */}
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">Add size</div>
                          <div className="flex gap-1 items-center">
                            <input
                              type="text"
                              className="input-field w-16 text-center text-sm uppercase"
                              placeholder="3XL"
                              value={line._newSize || ''}
                              onChange={e => updateLineItem(idx, '_newSize', e.target.value.toUpperCase())}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(idx, line._newSize); } }}
                            />
                            <button
                              type="button"
                              onClick={() => addSize(idx, line._newSize)}
                              className="text-blue-500 hover:text-blue-700 font-bold text-xl leading-none pb-0.5"
                              title="Add size"
                            >+</button>
                          </div>
                        </div>

                        {/* Running totals */}
                        <div className="text-center ml-3">
                          <div className="text-xs text-gray-500 mb-1">Total</div>
                          <div className="w-20 py-2 text-sm font-bold text-blue-600">{qty.toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Line Total</div>
                          <div className="w-28 py-2 text-sm font-bold text-green-600">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    </div>

                    {/* Shipping Orders — DC-level splits */}
                    <ShippingOrdersEditor
                      sizes={Object.keys(line.sizeBreakdown)}
                      lineSizeBreakdown={line.sizeBreakdown}
                      shippingOrders={line.shippingOrders || []}
                      onChange={sos => updateLineItem(idx, 'shippingOrders', sos)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Grand totals */}
          {lineItems.length > 0 && (
            <div className="flex justify-end gap-8 mt-4 pt-4 border-t">
              <div className="text-sm"><span className="text-gray-500">Total Qty:</span> <span className="font-bold text-lg">{grandTotal.qty.toLocaleString()}</span></div>
              <div className="text-sm"><span className="text-gray-500">Total Amount:</span> <span className="font-bold text-lg text-green-600">${grandTotal.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Purchase Order'}</button>
          <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
