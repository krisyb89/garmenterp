// src/app/(dashboard)/dashboard/supplier-pos/[id]/page.js
'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const STATUS_OPTIONS = ['DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED'];

export default function SupplierPODetailPage() {
  const { id } = useParams();
  const [spo, setSPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/supplier-pos/${id}`)
      .then(r => r.json())
      .then(setSPO)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(newStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/supplier-pos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSPO(prev => ({ ...prev, ...updated }));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!spo) return <div className="text-center py-20 text-red-500">Supplier PO not found</div>;

  const totalAmount = spo.lineItems?.reduce((sum, l) => sum + parseFloat(l.lineTotal || 0), 0) || parseFloat(spo.totalAmount || 0);

  return (
    <div>
      <Link href="/dashboard/supplier-pos" className="text-sm text-blue-600 mb-2 inline-block">&larr; Supplier POs</Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{spo.spoNo}</h1>
          <p className="text-gray-500 text-sm">{spo.supplier?.name} &bull; {spo.currency}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field"
            value={spo.status}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={saving}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
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
            <Link href={`/dashboard/purchase-orders/${spo.customerPOId}`} className="text-lg font-bold text-blue-600 hover:text-blue-800">
              {spo.customerPO.poNo}
            </Link>
          ) : (
            <p className="text-lg font-bold">—</p>
          )}
          {spo.customerPO?.customer && <p className="text-xs text-gray-400">{spo.customerPO.customer.name}</p>}
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-lg font-bold">{spo.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Delivery Date</p>
          <p className="text-lg font-bold">{spo.deliveryDate ? new Date(spo.deliveryDate).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {/* Line Items */}
          <div className="card">
            <h2 className="font-semibold mb-3">Line Items ({spo.lineItems?.length || 0})</h2>
            {!spo.lineItems?.length ? (
              <p className="text-sm text-gray-400">No line items</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead>
                    <tr><th>Description</th><th>Color</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Line Total</th></tr>
                  </thead>
                  <tbody>
                    {spo.lineItems.map(line => (
                      <tr key={line.id}>
                        <td>{line.description}</td>
                        <td>{line.color || '—'}</td>
                        <td>{parseFloat(line.quantity).toLocaleString()}</td>
                        <td>{line.unit}</td>
                        <td>{parseFloat(line.unitPrice).toFixed(2)}</td>
                        <td className="font-medium">{parseFloat(line.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td colSpan={5} className="text-right">Total:</td>
                      <td>{spo.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          {/* Order Info */}
          <div className="card mb-6">
            <h2 className="font-semibold mb-3">Order Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Order Date</dt><dd>{new Date(spo.orderDate).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Payment Terms</dt><dd>{spo.paymentTerms || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={spo.status} /></dd></div>
            </dl>
            {spo.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t">{spo.notes}</p>}
          </div>

          {/* Goods Received */}
          <div className="card">
            <h2 className="font-semibold mb-3">Goods Received ({spo.goodsReceived?.length || 0})</h2>
            {!spo.goodsReceived?.length ? (
              <p className="text-sm text-gray-400">No goods received yet</p>
            ) : (
              <div className="space-y-3">
                {spo.goodsReceived.map(gr => (
                  <div key={gr.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">Received {new Date(gr.receivedDate).toLocaleDateString()}</span>
                      <span className="text-gray-500">{gr.location || ''}</span>
                    </div>
                    {gr.items?.map(item => (
                      <div key={item.id} className="text-xs text-gray-600 flex justify-between py-0.5">
                        <span>{item.description} {item.color ? `(${item.color})` : ''}</span>
                        <span>{parseFloat(item.receivedQty).toLocaleString()} / {parseFloat(item.orderedQty).toLocaleString()} {item.unit}
                          {item.qcResult && <span className={`ml-1 ${item.qcResult === 'PASS' ? 'text-green-600' : item.qcResult === 'FAIL' ? 'text-red-600' : 'text-yellow-600'}`}>[{item.qcResult}]</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
