'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

export default function PODetailPage() {
  const { id } = useParams();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    fetch(`/api/purchase-orders/${id}`)
      .then(r => r.json())
      .then(data => {
        setPO(data);
        setForm({
          orderDate: formatDate(data.orderDate),
          shipByDate: formatDate(data.shipByDate),
          cancelDate: formatDate(data.cancelDate),
          shippingTerms: data.shippingTerms || 'FOB',
          portOfLoading: data.portOfLoading || '',
          portOfDischarge: data.portOfDischarge || '',
          currency: data.currency || 'USD',
          specialInstructions: data.specialInstructions || '',
          notes: data.notes || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(newStatus) {
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setPO(prev => ({ ...prev, status: newStatus }));
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.shipByDate) payload.shipByDate = null;
      if (!payload.cancelDate) payload.cancelDate = null;
      if (!payload.orderDate) delete payload.orderDate;

      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save changes');
        return;
      }
      const updated = await res.json();
      setPO(prev => ({ ...prev, ...updated }));
      setForm({
        orderDate: formatDate(updated.orderDate),
        shipByDate: formatDate(updated.shipByDate),
        cancelDate: formatDate(updated.cancelDate),
        shippingTerms: updated.shippingTerms || 'FOB',
        portOfLoading: updated.portOfLoading || '',
        portOfDischarge: updated.portOfDischarge || '',
        currency: updated.currency || 'USD',
        specialInstructions: updated.specialInstructions || '',
        notes: updated.notes || '',
      });
      setEditing(false);
    } catch {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setForm({
      orderDate: formatDate(po.orderDate),
      shipByDate: formatDate(po.shipByDate),
      cancelDate: formatDate(po.cancelDate),
      shippingTerms: po.shippingTerms || 'FOB',
      portOfLoading: po.portOfLoading || '',
      portOfDischarge: po.portOfDischarge || '',
      currency: po.currency || 'USD',
      specialInstructions: po.specialInstructions || '',
      notes: po.notes || '',
    });
    setEditing(false);
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!po) return <div className="text-center py-20 text-red-500">PO not found</div>;

  const allSizes = [...new Set(po.lineItems?.flatMap(l => Object.keys(l.sizeBreakdown || {})) || [])];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/purchase-orders" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Purchase Orders</Link>
          <h1 className="text-2xl font-bold">PO: {po.poNo}</h1>
          <p className="text-gray-500 text-sm">{po.customer?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={po.status} />
          <select className="select-field w-auto text-sm" value={po.status} onChange={e => updateStatus(e.target.value)}>
            {['RECEIVED', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'INVOICED', 'CLOSED', 'CANCELLED'].map(s =>
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* PO Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Qty</div>
          <div className="text-xl font-bold">{po.totalQty?.toLocaleString()}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-xl font-bold text-green-600">{po.currency} {parseFloat(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Ship By</div>
          <div className="text-lg font-bold">{po.shipByDate ? new Date(po.shipByDate).toLocaleDateString() : '—'}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Terms</div>
          <div className="text-lg font-bold">{po.shippingTerms}</div>
        </div>
        {po.pnl && (
          <div className="card text-center">
            <div className="text-xs text-gray-500">Gross Margin</div>
            <div className={`text-xl font-bold ${parseFloat(po.pnl.grossMargin) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {po.pnl.grossMargin}%
            </div>
          </div>
        )}
      </div>

      {/* PO Details - Editable */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">PO Details</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary text-xs">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={saveChanges} disabled={saving} className="btn-primary text-xs">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={cancelEdit} className="btn-secondary text-xs">Cancel</button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Order Date</label>
              <input type="date" className="input-field" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Ship By Date</label>
              <input type="date" className="input-field" value={form.shipByDate} onChange={e => setForm({ ...form, shipByDate: e.target.value })} />
            </div>
            <div>
              <label className="label-field">IH Date</label>
              <input type="date" className="input-field" value={form.cancelDate} onChange={e => setForm({ ...form, cancelDate: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Shipping Terms</label>
              <select className="select-field" value={form.shippingTerms} onChange={e => setForm({ ...form, shippingTerms: e.target.value })}>
                <option value="FOB">FOB</option><option value="CIF">CIF</option>
                <option value="DDP">DDP</option><option value="EXW">EXW</option>
              </select>
            </div>
            <div>
              <label className="label-field">Port of Loading</label>
              <input className="input-field" value={form.portOfLoading} onChange={e => setForm({ ...form, portOfLoading: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Port of Discharge</label>
              <input className="input-field" value={form.portOfDischarge} onChange={e => setForm({ ...form, portOfDischarge: e.target.value })} />
            </div>
            <div>
              <label className="label-field">Currency</label>
              <select className="select-field" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="label-field">Special Instructions</label>
              <input className="input-field" value={form.specialInstructions} onChange={e => setForm({ ...form, specialInstructions: e.target.value })} />
            </div>
            <div className="lg:col-span-4">
              <label className="label-field">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Order Date</div>
              <div className="text-sm font-medium">{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Ship By Date</div>
              <div className="text-sm font-medium">{po.shipByDate ? new Date(po.shipByDate).toLocaleDateString() : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">IH Date</div>
              <div className="text-sm font-medium">{po.cancelDate ? new Date(po.cancelDate).toLocaleDateString() : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Shipping Terms</div>
              <div className="text-sm font-medium">{po.shippingTerms || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Port of Loading</div>
              <div className="text-sm font-medium">{po.portOfLoading || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Port of Discharge</div>
              <div className="text-sm font-medium">{po.portOfDischarge || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Currency</div>
              <div className="text-sm font-medium">{po.currency || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Special Instructions</div>
              <div className="text-sm font-medium">{po.specialInstructions || '—'}</div>
            </div>
            {po.notes && (
              <div className="lg:col-span-4">
                <div className="text-xs text-gray-500 mb-1">Notes</div>
                <div className="text-sm">{po.notes}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Style</th>
                <th>Color</th>
                {allSizes.map(s => <th key={s} className="text-center">{s}</th>)}
                <th className="text-center">Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {po.lineItems?.map(line => (
                <tr key={line.id}>
                  <td className="font-medium">{line.style?.styleNo || '—'}</td>
                  <td>{line.color}</td>
                  {allSizes.map(s => (
                    <td key={s} className="text-center">{line.sizeBreakdown?.[s] || '—'}</td>
                  ))}
                  <td className="text-center font-medium">{line.totalQty?.toLocaleString()}</td>
                  <td>{po.currency} {parseFloat(line.unitPrice).toFixed(2)}</td>
                  <td className="font-medium">{po.currency} {parseFloat(line.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <h2 className="font-semibold mb-4">Order P&L</h2>
          {po.pnl && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Revenue</div>
                <div className="font-bold text-blue-700">{po.currency} {po.pnl.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500">Total Costs</div>
                <div className="font-bold text-red-700">{po.currency} {po.pnl.totalCosts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${po.pnl.grossProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-xs text-gray-500">Gross Profit</div>
                <div className={`font-bold ${po.pnl.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {po.currency} {po.pnl.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className={`rounded-lg p-3 text-center ${parseFloat(po.pnl.grossMargin) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-xs text-gray-500">Margin</div>
                <div className={`font-bold text-xl ${parseFloat(po.pnl.grossMargin) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {po.pnl.grossMargin}%
                </div>
              </div>
            </div>
          )}
          {po.orderCosts?.length > 0 ? (
            <table className="table-base">
              <thead><tr><th>Category</th><th>Description</th><th>Supplier</th><th>Amount</th><th>Currency</th><th>Base (USD)</th></tr></thead>
              <tbody>
                {po.orderCosts.map(c => (
                  <tr key={c.id}>
                    <td><span className="status-badge bg-gray-100 text-gray-600">{c.category}</span></td>
                    <td>{c.description}</td>
                    <td>{c.supplierName || '—'}</td>
                    <td>{parseFloat(c.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{c.currency}</td>
                    <td className="font-medium">{parseFloat(c.totalCostBase).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400">No costs recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
