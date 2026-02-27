// src/app/(dashboard)/dashboard/production/[id]/page.js
'use client';
import { useParams, useRouter } from 'next/navigation';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const PROD_STATUSES = ['PLANNED','MATERIAL_ISSUED','CUTTING','SEWING','WASHING_FINISHING','QC_INSPECTION','PACKING','READY_TO_SHIP','COMPLETED','ON_HOLD','CANCELLED'];

export default function ProductionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Production invoice form (P&L cost tracking)
  const [invForm, setInvForm] = useState({
    prodInvoiceQty: '',
    prodInvoiceUnitPrice: '',
    prodInvoiceCurrency: 'CNY',
    prodInvoiceTotal: '',
    vatRefundRate: '0',
  });
  const [invSaving, setInvSaving] = useState(false);
  const [invMsg, setInvMsg] = useState('');

  useEffect(() => {
    fetch(`/api/production-orders/${id}`)
      .then(r => r.json())
      .then(data => {
        setOrder(data);
        setInvForm({
          prodInvoiceQty:        data.prodInvoiceQty        != null ? String(data.prodInvoiceQty)        : '',
          prodInvoiceUnitPrice:  data.prodInvoiceUnitPrice  != null ? String(parseFloat(data.prodInvoiceUnitPrice))  : '',
          prodInvoiceCurrency:   data.prodInvoiceCurrency   || 'CNY',
          prodInvoiceTotal:      data.prodInvoiceTotal      != null ? String(parseFloat(data.prodInvoiceTotal))      : '',
          vatRefundRate:         data.vatRefundRate          != null ? String(parseFloat(data.vatRefundRate))         : '0',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  function handleInvChange(field, value) {
    setInvForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-calculate total when qty or unit price changes
      if (field === 'prodInvoiceQty' || field === 'prodInvoiceUnitPrice') {
        const qty = parseFloat(field === 'prodInvoiceQty' ? value : next.prodInvoiceQty) || 0;
        const price = parseFloat(field === 'prodInvoiceUnitPrice' ? value : next.prodInvoiceUnitPrice) || 0;
        if (qty > 0 && price > 0) next.prodInvoiceTotal = String((qty * price).toFixed(2));
      }
      return next;
    });
  }

  async function saveInvoice() {
    setInvSaving(true);
    setInvMsg('');
    try {
      const payload = {
        prodInvoiceQty:       invForm.prodInvoiceQty       ? parseInt(invForm.prodInvoiceQty)                : null,
        prodInvoiceUnitPrice: invForm.prodInvoiceUnitPrice ? parseFloat(invForm.prodInvoiceUnitPrice)        : null,
        prodInvoiceCurrency:  invForm.prodInvoiceCurrency  || 'CNY',
        prodInvoiceTotal:     invForm.prodInvoiceTotal     ? parseFloat(invForm.prodInvoiceTotal)            : null,
        vatRefundRate:        parseFloat(invForm.vatRefundRate) || 0,
      };
      const res = await fetch(`/api/production-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInvMsg('Saved ✓');
        setTimeout(() => setInvMsg(''), 2500);
      } else {
        setInvMsg('Failed');
      }
    } catch {
      setInvMsg('Failed');
    } finally {
      setInvSaving(false);
    }
  }

  async function updateStatus(status) {
    await fetch(`/api/production-orders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    setOrder({ ...order, status });
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this production order?')) return;
    try {
      const res = await fetch(`/api/production-orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard/production');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      alert('Failed to delete');
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!order) return <div className="text-center py-20 text-red-500">Not found</div>;

  const stages = ['CUTTING', 'SEWING', 'WASHING_FINISHING', 'QC_INSPECTION', 'PACKING'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/production" className="text-sm text-blue-600 mb-2 inline-block">← Production Orders</Link>
          <h1 className="text-2xl font-bold">{order.prodOrderNo}</h1>
          <p className="text-gray-500 text-sm">PO: {order.po?.poNo} | {order.po?.customer?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <select className="select-field w-auto text-sm" value={order.status} onChange={e => updateStatus(e.target.value)}>
            {PROD_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            type="button"
            onClick={handleDelete}
            className="btn-danger text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card text-center"><div className="text-xs text-gray-500">Style</div><div className="font-bold">{order.styleNo}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Color</div><div className="font-bold">{order.color || '—'}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Qty</div><div className="text-xl font-bold">{order.totalQty?.toLocaleString()}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Factory</div><div className="font-bold">{order.factory?.name}</div><div className="text-xs text-gray-400">{order.factory?.country}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">CMT Rate</div><div className="font-bold">{order.cmtRate ? `${order.cmtCurrency} ${order.cmtRate}` : '—'}</div></div>
      </div>

      {/* Production Stage Pipeline */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Production Pipeline</h2>
        <div className="flex gap-2">
          {stages.map((stage, i) => {
            const isActive = order.status === stage;
            const isPast = PROD_STATUSES.indexOf(order.status) > PROD_STATUSES.indexOf(stage);
            return (
              <div key={stage} className={`flex-1 rounded-lg p-3 text-center text-xs font-medium transition-colors
                ${isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400' :
                  isPast ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                <div>{isPast ? '✓' : isActive ? '▶' : '○'}</div>
                <div className="mt-1">{stage.replace(/_/g, ' ')}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Size Breakdown */}
        {order.sizeBreakdown && (
          <div className="card">
            <h2 className="font-semibold mb-4">Size Breakdown</h2>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(order.sizeBreakdown).map(([size, qty]) => (
                <div key={size} className="text-center bg-gray-50 rounded-lg px-4 py-2">
                  <div className="text-xs text-gray-500">{size}</div>
                  <div className="font-bold">{qty}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QC Inspections */}
        <div className="card">
          <h2 className="font-semibold mb-4">QC Inspections ({order.inspections?.length || 0})</h2>
          {order.inspections?.length === 0 ? (
            <p className="text-sm text-gray-400">No inspections recorded</p>
          ) : (
            <div className="space-y-2">
              {order.inspections.map(insp => (
                <div key={insp.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-sm">{insp.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-400 ml-2">{new Date(insp.inspectionDate).toLocaleDateString()}</span>
                  </div>
                  <StatusBadge status={insp.result} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Factory Invoice for P&L */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">Factory Invoice (P&L Cost)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Invoice qty/amount may differ from PO qty — used only for P&L cost calculation</p>
          </div>
          <div className="flex items-center gap-2">
            {invMsg && (
              <span className={`text-xs font-medium ${invMsg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {invMsg}
              </span>
            )}
            <button
              type="button"
              onClick={saveInvoice}
              disabled={invSaving}
              className="btn-primary text-xs"
            >
              {invSaving ? 'Saving…' : 'Save Invoice'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Invoice Qty</label>
            <input
              type="number"
              min="0"
              className="input-field text-sm"
              value={invForm.prodInvoiceQty}
              onChange={e => handleInvChange('prodInvoiceQty', e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field text-sm"
              value={invForm.prodInvoiceUnitPrice}
              onChange={e => handleInvChange('prodInvoiceUnitPrice', e.target.value)}
              placeholder="e.g. 28.50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Currency</label>
            <select
              className="select-field text-sm"
              value={invForm.prodInvoiceCurrency}
              onChange={e => handleInvChange('prodInvoiceCurrency', e.target.value)}
            >
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Invoice Total</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field text-sm"
              value={invForm.prodInvoiceTotal}
              onChange={e => handleInvChange('prodInvoiceTotal', e.target.value)}
              placeholder="Auto or override"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">VAT Refund Rate %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              className="input-field text-sm"
              value={invForm.vatRefundRate}
              onChange={e => handleInvChange('vatRefundRate', e.target.value)}
              placeholder="e.g. 13"
            />
          </div>
        </div>

        {invForm.prodInvoiceTotal && parseFloat(invForm.prodInvoiceTotal) > 0 && (
          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            <span>Invoice Total: <span className="font-bold text-gray-800">{invForm.prodInvoiceCurrency} {parseFloat(invForm.prodInvoiceTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            {parseFloat(invForm.vatRefundRate) > 0 && (
              <span>VAT Refund: <span className="font-bold text-green-600">{invForm.prodInvoiceCurrency} {(parseFloat(invForm.prodInvoiceTotal) * parseFloat(invForm.vatRefundRate) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
