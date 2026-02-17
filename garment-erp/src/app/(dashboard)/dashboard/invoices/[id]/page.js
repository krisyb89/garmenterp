// src/app/(dashboard)/dashboard/invoices/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);

  function reload() {
    fetch(`/api/invoices/${id}`).then(r => r.json()).then(setInvoice);
  }

  useEffect(() => { reload(); setLoading(false); }, [id]);

  async function recordPayment(e) {
    e.preventDefault();
    setPaying(true);
    const fd = new FormData(e.target);
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: {
          paymentDate: fd.get('paymentDate'),
          amount: parseFloat(fd.get('amount')),
          currency: invoice.currency,
          exchangeRate: parseFloat(fd.get('exchangeRate') || 1),
          bankReference: fd.get('bankReference'),
          paymentMethod: fd.get('paymentMethod'),
        },
      }),
    });
    setShowPayment(false);
    setPaying(false);
    reload();
  }

  if (loading || !invoice) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/invoices" className="text-sm text-blue-600 mb-2 inline-block">← Invoices</Link>
          <h1 className="text-2xl font-bold">{invoice.invoiceNo}</h1>
          <p className="text-gray-500 text-sm">{invoice.customer?.name} | PO: {invoice.po?.poNo}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-xl font-bold">{invoice.currency} {parseFloat(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Amount Paid</div>
          <div className="text-xl font-bold text-green-600">{invoice.currency} {parseFloat(invoice.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Amount Due</div>
          <div className={`text-xl font-bold ${parseFloat(invoice.amountDue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {invoice.currency} {parseFloat(invoice.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Due Date</div>
          <div className="text-lg font-bold">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'TBD (awaiting ROG)'}</div>
        </div>
      </div>

      {/* Line Items */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Line Items</h2>
        <table className="table-base">
          <thead><tr><th>Style</th><th>Color</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
          <tbody>
            {invoice.lineItems?.map(line => (
              <tr key={line.id}>
                <td className="font-medium">{line.styleNo}</td><td>{line.color}</td>
                <td>{line.quantity?.toLocaleString()}</td>
                <td>{invoice.currency} {parseFloat(line.unitPrice).toFixed(2)}</td>
                <td className="font-medium">{invoice.currency} {parseFloat(line.lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Payments Received</h2>
          {parseFloat(invoice.amountDue) > 0 && (
            <button className="btn-success text-sm" onClick={() => setShowPayment(!showPayment)}>+ Record Payment</button>
          )}
        </div>

        {showPayment && (
          <form onSubmit={recordPayment} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div><label className="label-field">Date *</label><input name="paymentDate" type="date" className="input-field" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
              <div><label className="label-field">Amount * ({invoice.currency})</label><input name="amount" type="number" step="0.01" className="input-field" required /></div>
              <div><label className="label-field">Bank Reference</label><input name="bankReference" className="input-field" /></div>
              <div><label className="label-field">Method</label>
                <select name="paymentMethod" className="select-field"><option value="Wire">Wire Transfer</option><option value="Check">Check</option><option value="LC">Letter of Credit</option></select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={paying}>{paying ? 'Recording...' : 'Record Payment'}</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowPayment(false)}>Cancel</button>
            </div>
          </form>
        )}

        {invoice.payments?.length === 0 ? (
          <p className="text-sm text-gray-400">No payments recorded</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Bank Ref</th></tr></thead>
            <tbody>
              {invoice.payments?.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="font-medium text-green-600">{p.currency} {parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>{p.paymentMethod || '—'}</td><td>{p.bankReference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
