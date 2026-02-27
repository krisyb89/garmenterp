// src/app/(dashboard)/dashboard/purchase-orders/[id]/page.js
'use client';
import { useParams } from 'next/navigation';

const SIZE_ORDER = ['XXXS','XXS','XS','S','M','L','XL','XXL','2XL','XXXL','3XL','4XL','ONE SIZE'];
function sortedSizes(keys) {
  return [...keys].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import ShippingOrdersEditor from '@/components/ShippingOrdersEditor';

export default function PODetailPage() {
  const { id } = useParams();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  // Exchange rate — lives in the P&L section, saved independently
  const [exRate, setExRate] = useState('1');
  const [exRateMsg, setExRateMsg] = useState('');

  // Editable header fields
  const [hdr, setHdr] = useState({ store: '', brand: '', shippingTerms: '', cancelDate: '', shipByDate: '', notes: '', specialInstructions: '' });
  // Editable line items
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    fetch(`/api/purchase-orders/${id}`)
      .then(r => r.json())
      .then(data => {
        setPO(data);
        setExRate(data.exchangeRate ? String(parseFloat(data.exchangeRate)) : '1');
        setHdr({
          store:               data.store               || '',
          brand:               data.brand               || '',
          shippingTerms:       data.shippingTerms       || 'FOB',
          cancelDate:          data.cancelDate  ? data.cancelDate.split('T')[0]  : '',
          shipByDate:          data.shipByDate  ? data.shipByDate.split('T')[0]  : '',
          notes:               data.notes               || '',
          specialInstructions: data.specialInstructions || '',
        });
        setLineItems((data.lineItems || []).map(l => ({
          id:            l.id,
          styleNo:       l.style?.styleNo || '—',
          color:         l.color         || '',
          colorCode:     l.colorCode     || '',
          unitPrice:     parseFloat(l.unitPrice || 0).toFixed(2),
          sizeBreakdown: { ...(l.sizeBreakdown || {}) },
          // Re-attach local _id for React keys (stripped by API)
          shippingOrders: Array.isArray(l.shippingOrders)
            ? l.shippingOrders.map(so => ({ _id: Math.random().toString(36).slice(2), ...so }))
            : [],
          deliveryDate:  l.deliveryDate ? l.deliveryDate.split('T')[0] : '',
          notes:         l.notes        || '',
          _newSize:      '',
        })));
      })
      .finally(() => setLoading(false));
  }, [id]);

  function updateLineItem(idx, field, value) {
    setLineItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function updateSize(idx, size, value) {
    setLineItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], sizeBreakdown: { ...next[idx].sizeBreakdown, [size]: value } };
      return next;
    });
  }

  function addSize(idx, sizeName) {
    const name = (sizeName || '').trim().toUpperCase();
    if (!name) return;
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (name in item.sizeBreakdown) return { ...item, _newSize: '' };
      return { ...item, sizeBreakdown: { ...item.sizeBreakdown, [name]: '' }, _newSize: '' };
    }));
  }

  function removeSize(idx, size) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const { [size]: _removed, ...rest } = item.sizeBreakdown;
      return { ...item, sizeBreakdown: rest };
    }));
  }

  function getLineCalc(line) {
    const qty = Object.values(line.sizeBreakdown).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
    const amount = qty * (parseFloat(line.unitPrice) || 0);
    return { qty, amount };
  }

  async function updateStatus(newStatus) {
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setPO(prev => ({ ...prev, status: newStatus }));
  }

  async function handleSaveExRate() {
    setExRateMsg('Saving…');
    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeRate: parseFloat(exRate) || 1 }),
      });
      if (res.ok) {
        // Refetch full PO so P&L recalculates with the new exchange rate
        const refreshed = await fetch(`/api/purchase-orders/${id}`).then(r => r.json());
        setPO(refreshed);
        setExRateMsg('Saved ✓');
        setTimeout(() => setExRateMsg(''), 2500);
      } else {
        setExRateMsg('Failed');
      }
    } catch {
      setExRateMsg('Failed');
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    setConfirmSave(false);
    try {
      const processedLines = lineItems.map(l => ({
        id:             l.id,
        color:          l.color,
        colorCode:      l.colorCode,
        unitPrice:      parseFloat(l.unitPrice) || 0,
        shippingOrders: l.shippingOrders || [],
        sizeBreakdown:  Object.fromEntries(
          Object.entries(l.sizeBreakdown).map(([k, v]) => [k, parseInt(v) || 0])
        ),
        deliveryDate:   l.deliveryDate || null,
        notes:          l.notes        || null,
      }));

      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store:               hdr.store               || null,
          brand:               hdr.brand               || null,
          shippingTerms:       hdr.shippingTerms,
          cancelDate:          hdr.cancelDate           || null,
          ihDate:              hdr.cancelDate           || null,
          shipByDate:          hdr.shipByDate           || null,
          notes:               hdr.notes               || null,
          specialInstructions: hdr.specialInstructions || null,
          lineItems:           processedLines,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPO(prev => ({ ...prev, ...updated }));
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(''), 2500);
      } else {
        const err = await res.json();
        setSaveMsg(err.error || 'Save failed');
      }
    } catch {
      setSaveMsg('Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!po) return <div className="text-center py-20 text-red-500">PO not found</div>;

  const grandQty    = lineItems.reduce((s, l) => s + getLineCalc(l).qty, 0);
  const grandAmount = lineItems.reduce((s, l) => s + getLineCalc(l).amount, 0);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/purchase-orders" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Purchase Orders</Link>
          <h1 className="text-2xl font-bold">PO: {po.poNo}</h1>
          <p className="text-gray-500 text-sm">{po.customer?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={po.status} />
          <select className="select-field w-auto text-sm" value={po.status} onChange={e => updateStatus(e.target.value)}>
            {['RECEIVED','CONFIRMED','IN_PRODUCTION','PARTIALLY_SHIPPED','FULLY_SHIPPED','INVOICED','CLOSED','CANCELLED'].map(s =>
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Qty</div>
          <div className="text-xl font-bold">{grandQty.toLocaleString()}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-xl font-bold text-green-600">{po.currency} {grandAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Ship By</div>
          <div className="text-lg font-bold">{po.shipByDate ? new Date(po.shipByDate).toLocaleDateString() : '—'}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Cancel Date</div>
          <div className="text-lg font-bold">{po.cancelDate ? new Date(po.cancelDate).toLocaleDateString() : '—'}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Order Date</div>
          <div className="text-lg font-bold">{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '—'}</div>
        </div>
      </div>

      {/* Editable PO Details */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">PO Details</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label-field">Store</label>
            <input className="input-field" value={hdr.store} onChange={e => setHdr(h => ({ ...h, store: e.target.value }))} placeholder="e.g., Nordstrom" />
          </div>
          <div>
            <label className="label-field">Brand</label>
            <input className="input-field" value={hdr.brand} onChange={e => setHdr(h => ({ ...h, brand: e.target.value }))} placeholder="e.g., Nike" />
          </div>
          <div>
            <label className="label-field">Shipping Terms</label>
            <select className="select-field" value={hdr.shippingTerms} onChange={e => setHdr(h => ({ ...h, shippingTerms: e.target.value }))}>
              <option value="FOB">FOB</option><option value="CIF">CIF</option>
              <option value="DDP">DDP</option><option value="EXW">EXW</option>
            </select>
          </div>
          <div>
            <label className="label-field">Currency</label>
            <div className="input-field bg-gray-50 text-gray-500">{po.currency}</div>
          </div>
          <div>
            <label className="label-field">Cancel Date (IH Date)</label>
            <input type="date" className="input-field" value={hdr.cancelDate} onChange={e => setHdr(h => ({ ...h, cancelDate: e.target.value }))} />
          </div>
          <div>
            <label className="label-field">Ship By Date</label>
            <input type="date" className="input-field" value={hdr.shipByDate} onChange={e => setHdr(h => ({ ...h, shipByDate: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label-field">Special Instructions</label>
            <input className="input-field" value={hdr.specialInstructions} onChange={e => setHdr(h => ({ ...h, specialInstructions: e.target.value }))} />
          </div>
          <div>
            <label className="label-field">Notes</label>
            <input className="input-field" value={hdr.notes} onChange={e => setHdr(h => ({ ...h, notes: e.target.value }))} />
          </div>
        </div>
        {(po.portOfLoading || po.portOfDischarge) && (
          <p className="text-xs text-gray-400 mt-3">Port: {po.portOfLoading || '—'} → {po.portOfDischarge || '—'}</p>
        )}
      </div>

      {/* Editable Line Items */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Line Items</h2>
        <div className="space-y-4">
          {lineItems.map((line, idx) => {
            const sizes = sortedSizes(Object.keys(line.sizeBreakdown));
            const { qty, amount } = getLineCalc(line);
            return (
              <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="label-field">Style</label>
                    <div className="input-field bg-gray-50 text-gray-700 font-medium">{line.styleNo}</div>
                  </div>
                  <div>
                    <label className="label-field">Color</label>
                    <input className="input-field" value={line.color} onChange={e => updateLineItem(idx, 'color', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Color Code</label>
                    <input className="input-field" value={line.colorCode} onChange={e => updateLineItem(idx, 'colorCode', e.target.value)} />
                  </div>
                  <div>
                    <label className="label-field">Unit Price ({po.currency})</label>
                    <input type="number" step="0.01" className="input-field" value={line.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label-field mb-2">Size Breakdown</label>
                  <div className="flex gap-2 flex-wrap items-end mt-1">

                    {/* Existing sizes — each with a × to remove */}
                    {sizes.map(size => (
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
                          value={line.sizeBreakdown[size] ?? ''}
                          onChange={e => updateSize(idx, size, e.target.value)}
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

                    <div className="text-center ml-3">
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="w-20 py-2 text-sm font-bold text-blue-600">{qty.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Line Total</div>
                      <div className="w-28 py-2 text-sm font-bold text-green-600">{po.currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>

                {/* Shipping Orders — DC-level splits */}
                <ShippingOrdersEditor
                  sizes={sizes}
                  lineSizeBreakdown={line.sizeBreakdown}
                  shippingOrders={line.shippingOrders || []}
                  onChange={sos => updateLineItem(idx, 'shippingOrders', sos)}
                />
              </div>
            );
          })}
        </div>

        {/* Grand totals */}
        <div className="flex justify-end gap-8 mt-4 pt-4 border-t">
          <div className="text-sm"><span className="text-gray-500">Total Qty:</span> <span className="font-bold text-lg">{grandQty.toLocaleString()}</span></div>
          <div className="text-sm"><span className="text-gray-500">Total Amount:</span> <span className="font-bold text-lg text-green-600">{po.currency} {grandAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 mb-6">
        {!confirmSave ? (
          <button onClick={() => setConfirmSave(true)} disabled={saving} className="btn-primary">
            Save Changes
          </button>
        ) : (
          <>
            <button onClick={handleSave} disabled={saving} className="btn-primary bg-amber-600 hover:bg-amber-700">
              {saving ? 'Saving…' : '✓ Confirm Save'}
            </button>
            <button onClick={() => setConfirmSave(false)} disabled={saving} className="btn-secondary">
              Cancel
            </button>
          </>
        )}
        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
            {saveMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Orders */}
        <div className="card">
          <h2 className="font-semibold mb-4">Production Orders ({po.productionOrders?.length || 0})</h2>
          {po.productionOrders?.length === 0 ? (
            <p className="text-sm text-gray-400">No production orders yet</p>
          ) : (
            <div className="space-y-2">
              {po.productionOrders?.map(prod => (
                <Link key={prod.id} href={`/dashboard/production/${prod.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-sm">{prod.prodOrderNo}</span>
                    <span className="text-xs text-gray-400 ml-2">{prod.factory?.name} ({prod.factory?.country})</span>
                  </div>
                  <StatusBadge status={prod.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Shipments */}
        <div className="card">
          <h2 className="font-semibold mb-4">Shipments ({po.shipments?.length || 0})</h2>
          {po.shipments?.length === 0 ? (
            <p className="text-sm text-gray-400">No shipments yet</p>
          ) : (
            <div className="space-y-2">
              {po.shipments?.map(ship => (
                <Link key={ship.id} href={`/dashboard/shipments/${ship.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-sm">{ship.shipmentNo}</span>
                    <span className="text-xs text-gray-400 ml-2">{ship.shipmentMethod} | {ship.vesselName || '—'}</span>
                  </div>
                  <StatusBadge status={ship.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Order Costs / P&L */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Order P&L</h2>
            {po.pnl?.isActual && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Actual (Invoiced)</span>
            )}
            {po.pnl && !po.pnl.isActual && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Estimated (No invoices sent)</span>
            )}
          </div>

          {/* Exchange Rate — inline editor */}
          <div className="flex items-center gap-2 mb-4 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
              Exchange Rate ({po.currency} → CNY)
            </span>
            <input
              type="number"
              step="0.0001"
              min="0"
              className="input-field w-28 text-sm py-1"
              value={exRate}
              onChange={e => setExRate(e.target.value)}
              placeholder="1.0"
              onKeyDown={e => e.key === 'Enter' && handleSaveExRate()}
            />
            <button
              onClick={handleSaveExRate}
              className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap"
            >
              Save Rate
            </button>
            {exRateMsg && (
              <span className={`text-xs font-medium ${exRateMsg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {exRateMsg}
              </span>
            )}
          </div>

          {po.pnl && (
            <>
              {/* Estimated P&L Row */}
              <div className="text-xs text-gray-500 font-medium mb-1 mt-2">Estimated (from PO)</div>
              <div className="grid grid-cols-4 gap-3 mb-2">
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-400">Revenue</div>
                  <div className="font-bold text-blue-700 text-sm">CNY {(po.pnl.estRevenue || po.pnl.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-400">Net Costs</div>
                  <div className="font-bold text-red-700 text-sm">CNY {(po.pnl.netCosts ?? po.pnl.totalCosts ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className={`rounded-lg p-2 text-center ${(po.pnl.estProfit || po.pnl.grossProfit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-xs text-gray-400">Profit</div>
                  <div className={`font-bold text-sm ${(po.pnl.estProfit || po.pnl.grossProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    CNY {(po.pnl.estProfit || po.pnl.grossProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`rounded-lg p-2 text-center ${(po.pnl.estMargin || po.pnl.grossMargin || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-xs text-gray-400">Margin</div>
                  <div className={`font-bold text-lg ${(po.pnl.estMargin || po.pnl.grossMargin || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {po.pnl.estMargin || po.pnl.grossMargin || 0}%
                  </div>
                </div>
              </div>

              {/* Cost breakdown row */}
              {(po.pnl.productionCostTotal > 0 || po.pnl.vatRefund > 0) && (
                <div className="flex gap-3 text-xs text-gray-500 mb-3 px-1 flex-wrap">
                  <span>Order Costs: <span className="font-medium text-gray-700">CNY {(po.pnl.orderCostTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  {po.pnl.productionCostTotal > 0 && (
                    <span>+ Prod Invoice: <span className="font-medium text-gray-700">CNY {po.pnl.productionCostTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  )}
                  {po.pnl.vatRefund > 0 && (
                    <span>− VAT Refund: <span className="font-medium text-green-600">CNY {po.pnl.vatRefund.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                  )}
                </div>
              )}

              {/* Actual P&L Row (only if invoiced) */}
              {po.pnl.isActual && (
                <>
                  <div className="text-xs text-gray-500 font-medium mb-1">Actual (from {po.pnl.invoiceCount} invoice{po.pnl.invoiceCount !== 1 ? 's' : ''})</div>
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="bg-blue-50 rounded-lg p-2 text-center border-2 border-blue-200">
                      <div className="text-xs text-gray-400">Revenue</div>
                      <div className="font-bold text-blue-700 text-sm">CNY {(po.pnl.actRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      {po.pnl.revenueVariance != null && po.pnl.revenueVariance !== 0 && (
                        <div className={`text-xs mt-0.5 ${po.pnl.revenueVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {po.pnl.revenueVariance > 0 ? '+' : ''}{po.pnl.revenueVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vs est
                        </div>
                      )}
                    </div>
                    <div className="bg-red-50 rounded-lg p-2 text-center border-2 border-red-200">
                      <div className="text-xs text-gray-400">Net Costs</div>
                      <div className="font-bold text-red-700 text-sm">CNY {(po.pnl.netCosts ?? po.pnl.totalCosts ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div className={`rounded-lg p-2 text-center border-2 ${(po.pnl.actProfit || 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-xs text-gray-400">Profit</div>
                      <div className={`font-bold text-sm ${(po.pnl.actProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        CNY {(po.pnl.actProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className={`rounded-lg p-2 text-center border-2 ${(po.pnl.actMargin || 0) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-xs text-gray-400">Margin</div>
                      <div className={`font-bold text-lg ${(po.pnl.actMargin || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {po.pnl.actMargin || 0}%
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Color-Level P&L Breakdown */}
          {po.colorPnL?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">P&L by Style-Color</h3>
              <div className="overflow-x-auto">
                <table className="table-base" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Style#</th>
                      <th>Color</th>
                      <th>Qty</th>
                      <th>Est Revenue</th>
                      {po.pnl?.isActual && <th>Act Revenue</th>}
                      <th>Direct Costs</th>
                      <th>Allocated</th>
                      <th>Total Costs</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.colorPnL.map(cl => {
                      const margin = po.pnl?.isActual ? cl.actMargin : cl.estMargin;
                      const marginColor = margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-amber-600' : 'text-red-600';
                      const fmt = n => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      return (
                        <tr key={cl.poLineItemId}>
                          <td className="font-medium">{cl.styleNo}</td>
                          <td>{cl.color}</td>
                          <td>{cl.qty?.toLocaleString()}</td>
                          <td>{fmt(cl.estRevenue)}</td>
                          {po.pnl?.isActual && <td>{fmt(cl.actRevenue)}</td>}
                          <td>{fmt((cl.directCosts || 0) + (cl.prodCosts || 0))}</td>
                          <td className="text-gray-400">{fmt(cl.allocatedCosts)}</td>
                          <td className="font-medium">{fmt(cl.totalCosts)}</td>
                          <td className={`font-bold ${marginColor}`}>{margin != null ? `${margin}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cost detail table */}
          {(po.orderCosts?.length > 0 || po.pnl?.productionOrders?.some(p => parseFloat(p.prodInvoiceTotal || 0) > 0)) && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Cost Details</h3>
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Category</th><th>Description</th><th>Supplier</th>
                    <th>Gross</th><th className="text-green-700">VAT Refund</th><th>Net Cost</th>
                    <th>Currency</th><th>Base (CNY)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Production invoice rows — shown first as CMT segment */}
                  {po.pnl?.productionOrders?.filter(p => parseFloat(p.prodInvoiceTotal || 0) > 0).map(p => {
                    const gross      = parseFloat(p.prodInvoiceTotal || 0);
                    const vatRefund  = gross * parseFloat(p.vatRefundRate || 0) / 100;
                    const net        = gross - vatRefund;
                    const currency   = p.prodInvoiceCurrency || 'CNY';
                    const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return (
                      <tr key={`prod-${p.id}`}>
                        <td><span className="status-badge bg-purple-100 text-purple-700">CMT</span></td>
                        <td>{p.prodOrderNo}{p.factory?.name ? ` — ${p.factory.name}` : ''}</td>
                        <td>{p.factory?.name || '—'}</td>
                        <td className="text-gray-600">{fmt(gross)}</td>
                        <td className="text-green-600">{vatRefund > 0 ? `− ${fmt(vatRefund)}` : '—'}</td>
                        <td className="font-medium">{fmt(net)}</td>
                        <td>{currency}</td>
                        <td className="font-medium text-blue-700">{fmt(net)}</td>
                      </tr>
                    );
                  })}
                  {/* Order cost rows — fabric, trims, freight, etc. */}
                  {po.orderCosts?.map(c => {
                    // Parse VAT breakdown from notes: "| VAT refund: 1950.00 (gross: 15000.00)"
                    const vatMatch = c.notes?.match(/VAT refund:\s*([\d.]+)\s*\(gross:\s*([\d.]+)\)/);
                    const gross    = vatMatch ? parseFloat(vatMatch[2]) : parseFloat(c.totalCost);
                    const vatRefund = vatMatch ? parseFloat(vatMatch[1]) : 0;
                    const net      = parseFloat(c.totalCost);
                    const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    return (
                      <tr key={c.id}>
                        <td><span className="status-badge bg-gray-100 text-gray-600">{c.category}</span></td>
                        <td>{c.description}</td>
                        <td>{c.supplierName || '—'}</td>
                        <td className="text-gray-600">{fmt(gross)}</td>
                        <td className="text-green-600">{vatRefund > 0 ? `− ${fmt(vatRefund)}` : '—'}</td>
                        <td className="font-medium">{fmt(net)}</td>
                        <td>{c.currency}</td>
                        <td className="font-medium text-blue-700">{fmt(parseFloat(c.totalCostBase))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!po.orderCosts?.length && !po.colorPnL?.length && !po.pnl?.productionOrders?.some(p => parseFloat(p.prodInvoiceTotal || 0) > 0) && (
            <p className="text-sm text-gray-400">No costs recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
