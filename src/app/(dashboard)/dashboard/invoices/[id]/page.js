// src/app/(dashboard)/dashboard/invoices/[id]/page.js
'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const fmtCur = (v) => parseFloat(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function saveHeaderFields(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.target);
    const data = {};
    for (const [k, v] of fd.entries()) { data[k] = v || null; }
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditingHeader(false);
    setSaving(false);
    reload();
  }

  async function updateStatus(newStatus) {
    await fetch(`/api/invoices/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    reload();
  }

  if (loading || !invoice) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  // Group line items by PO for multi-PO invoices
  const poGroups = {};
  for (const line of (invoice.lineItems || [])) {
    const poKey = line.po?.poNo || invoice.po?.poNo || 'Unknown PO';
    if (!poGroups[poKey]) poGroups[poKey] = [];
    poGroups[poKey].push(line);
  }
  const poKeys = Object.keys(poGroups);

  // Calculate total units
  const totalUnits = (invoice.lineItems || []).reduce((sum, line) => sum + (parseFloat(line.quantity) || 0), 0);

  return (
    <div>
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/dashboard/invoices" className="text-sm text-blue-600 mb-2 inline-block">&larr; Invoices</Link>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <button className="btn-primary text-sm" onClick={() => updateStatus('SENT')}>Mark Sent</button>
          )}
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Commercial Invoice Format */}
      <div className="card mb-6 p-6 bg-white border border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Commercial Invoice</h2>
          <button className="text-sm text-blue-600" onClick={() => setEditingHeader(!editingHeader)}>
            {editingHeader ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editingHeader ? (
          <form onSubmit={saveHeaderFields} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label-field">Shipper/Exporter Name</label><input name="shipperName" className="input-field" defaultValue={invoice.shipperName || ''} /></div>
              <div><label className="label-field">Shipper Address</label><textarea name="shipperAddress" className="input-field" rows={2} defaultValue={invoice.shipperAddress || ''} /></div>
              <div><label className="label-field">Consignee Name</label><input name="consigneeName" className="input-field" defaultValue={invoice.consigneeName || ''} /></div>
              <div><label className="label-field">Consignee Address</label><textarea name="consigneeAddress" className="input-field" rows={2} defaultValue={invoice.consigneeAddress || ''} /></div>
              <div><label className="label-field">Forwarder Name</label><input name="forwarderName" className="input-field" defaultValue={invoice.forwarderName || ''} /></div>
              <div><label className="label-field">Forwarder Address</label><textarea name="forwarderAddress" className="input-field" rows={2} defaultValue={invoice.forwarderAddress || ''} /></div>
              <div><label className="label-field">Notify Party Name</label><input name="notifyPartyName" className="input-field" defaultValue={invoice.notifyPartyName || ''} /></div>
              <div><label className="label-field">Notify Party Address</label><textarea name="notifyPartyAddress" className="input-field" rows={2} defaultValue={invoice.notifyPartyAddress || ''} /></div>
              <div><label className="label-field">Manufacturer Name</label><input name="manufacturerName" className="input-field" defaultValue={invoice.manufacturerName || ''} /></div>
              <div><label className="label-field">Manufacturer Address</label><textarea name="manufacturerAddress" className="input-field" rows={2} defaultValue={invoice.manufacturerAddress || ''} /></div>
              <div><label className="label-field">Ship To Name</label><input name="shipToName" className="input-field" defaultValue={invoice.shipToName || ''} /></div>
              <div><label className="label-field">Ship To Address</label><textarea name="shipToAddress" className="input-field" rows={2} defaultValue={invoice.shipToAddress || ''} /></div>
              <div><label className="label-field">Payment Terms</label><input name="paymentTerms" className="input-field" defaultValue={invoice.paymentTerms || ''} /></div>
              <div><label className="label-field">Sales Terms / Incoterms</label><input name="incoterms" className="input-field" defaultValue={invoice.incoterms || ''} /></div>
              <div><label className="label-field">Country of Origin</label><input name="countryOfOrigin" className="input-field" defaultValue={invoice.countryOfOrigin || ''} /></div>
              <div><label className="label-field">Reference #</label><input name="referenceNo" className="input-field" defaultValue={invoice.referenceNo || ''} /></div>
              <div><label className="label-field">Container / AWB No.</label><input name="containerNo" className="input-field" defaultValue={invoice.containerNo || ''} /></div>
              <div><label className="label-field">MID</label><input name="mid" className="input-field" defaultValue={invoice.mid || ''} /></div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setEditingHeader(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="border border-gray-300 bg-gray-50">
            {/* Header Grid - 3 rows, 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-300">
              {/* Row 1 */}
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">SHIPPER/EXPORTER</div>
                <div className="text-sm font-medium text-gray-900">{invoice.shipperName || '—'}</div>
                {invoice.shipperAddress && <div className="text-xs text-gray-600 mt-1">{invoice.shipperAddress}</div>}
              </div>
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">MANUFACTURER</div>
                <div className="text-sm font-medium text-gray-900">{invoice.manufacturerName || '—'}</div>
                {invoice.manufacturerAddress && <div className="text-xs text-gray-600 mt-1">{invoice.manufacturerAddress}</div>}
              </div>
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">INVOICE #</div>
                <div className="text-lg font-bold text-gray-900">{invoice.invoiceNo}</div>
                <div className="text-xs text-gray-600 mt-1">Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</div>
              </div>

              {/* Row 2 */}
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">CONSIGNEE</div>
                <div className="text-sm font-medium text-gray-900">{invoice.consigneeName || '—'}</div>
                {invoice.consigneeAddress && <div className="text-xs text-gray-600 mt-1">{invoice.consigneeAddress}</div>}
              </div>
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">SHIP TO</div>
                <div className="text-sm font-medium text-gray-900">{invoice.shipToName || '—'}</div>
                {invoice.shipToAddress && <div className="text-xs text-gray-600 mt-1">{invoice.shipToAddress}</div>}
              </div>
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">PAYMENT TERMS</div>
                <div className="text-sm font-medium text-gray-900">{invoice.paymentTerms || '—'}</div>
                <div className="text-xs text-gray-600 mt-2">
                  <div className="mb-1"><span className="font-semibold">SALES/INCO:</span> {invoice.incoterms || '—'}</div>
                  <div><span className="font-semibold">CURRENCY:</span> {invoice.currency || '—'}</div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">FORWARDER</div>
                <div className="text-sm font-medium text-gray-900">{invoice.forwarderName || '—'}</div>
                {invoice.forwarderAddress && <div className="text-xs text-gray-600 mt-1">{invoice.forwarderAddress}</div>}
              </div>
              <div className="bg-white p-3 border border-gray-300 col-span-2">
                <div className="text-xs font-semibold text-gray-500 mb-1">NOTIFY PARTY</div>
                <div className="text-sm font-medium text-gray-900">{invoice.notifyPartyName || '—'}</div>
                {invoice.notifyPartyAddress && <div className="text-xs text-gray-600 mt-1">{invoice.notifyPartyAddress}</div>}
              </div>

              {/* Row 4 - Bottom section */}
              <div className="bg-white p-3 border border-gray-300">
                <div className="text-xs font-semibold text-gray-500 mb-1">COUNTRY OF ORIGIN</div>
                <div className="text-sm font-medium text-gray-900">{invoice.countryOfOrigin || '—'}</div>
                <div className="text-xs text-gray-600 mt-2">
                  <div className="font-semibold">MID:</div>
                  <div>{invoice.mid || '—'}</div>
                </div>
              </div>
              <div className="bg-white p-3 border border-gray-300 col-span-2">
                <div className="text-xs font-semibold text-gray-500 mb-1">CONTAINER OR AWB NO.</div>
                <div className="text-sm font-medium text-gray-900 mb-2">{invoice.containerNo || '—'}</div>
                <div className="text-xs text-gray-600">
                  <div className="mb-1"><span className="font-semibold">REF #:</span> {invoice.referenceNo || '—'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shipment Details if available */}
        {invoice.shipment && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {invoice.shipment.shipmentNo && <div><span className="text-gray-500">Shipment No:</span> <span className="font-medium">{invoice.shipment.shipmentNo}</span></div>}
              {invoice.shipment.vesselName && <div><span className="text-gray-500">Vessel:</span> <span className="font-medium">{invoice.shipment.vesselName}</span></div>}
              {invoice.shipment.blNo && <div><span className="text-gray-500">BL No:</span> <span className="font-medium">{invoice.shipment.blNo}</span></div>}
              {invoice.shipment.etd && <div><span className="text-gray-500">ETD:</span> <span className="font-medium">{new Date(invoice.shipment.etd).toLocaleDateString()}</span></div>}
              {invoice.shipment.eta && <div><span className="text-gray-500">ETA:</span> <span className="font-medium">{new Date(invoice.shipment.eta).toLocaleDateString()}</span></div>}
              {invoice.shipment.portOfLoading && <div><span className="text-gray-500">Port of Loading:</span> <span className="font-medium">{invoice.shipment.portOfLoading}</span></div>}
              {invoice.shipment.portOfDischarge && <div><span className="text-gray-500">Port of Discharge:</span> <span className="font-medium">{invoice.shipment.portOfDischarge}</span></div>}
              {invoice.shipment.shippingTerms && <div><span className="text-gray-500">Shipping Terms:</span> <span className="font-medium">{invoice.shipment.shippingTerms}</span></div>}
            </div>
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Line Items</h2>
        {poKeys.map(poNo => (
          <div key={poNo} className="mb-4">
            {poKeys.length > 1 && <h3 className="text-sm font-medium text-gray-600 mb-2 bg-gray-50 px-3 py-1.5 rounded">PO: {poNo}</h3>}
            <table className="table-base">
              <thead>
                <tr>
                  <th>PO NO</th>
                  <th>STYLE NO</th>
                  <th>CUSTOMER</th>
                  <th>DESCRIPTION</th>
                  {poGroups[poNo].some(l => l.htsCode) && <th>HTS#</th>}
                  <th>QTY</th>
                  <th>UNIT</th>
                  <th>UNIT PRICE</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {poGroups[poNo].map(line => (
                  <tr key={line.id}>
                    <td className="font-medium">{line.po?.poNo || poNo}</td>
                    <td>{line.styleNo || '—'}</td>
                    <td>{line.customerName || invoice.customer?.name || '—'}</td>
                    <td className="text-sm">{line.description || `${line.color ? line.color + ' ' : ''}${line.styleNo}`}</td>
                    {poGroups[poNo].some(l => l.htsCode) && <td className="text-xs font-mono">{line.htsCode || '—'}</td>}
                    <td className="text-right">{line.quantity?.toLocaleString()}</td>
                    <td>{line.unit || 'PCS'}</td>
                    <td className="text-right">{invoice.currency} {parseFloat(line.unitPrice).toFixed(2)}</td>
                    <td className="font-medium text-right">{invoice.currency} {fmtCur(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* Invoice Footer */}
        <div className="border-t-2 border-gray-400 pt-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold">TOTAL UNITS:</span>
                <span className="font-medium">{totalUnits?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">GROSS WEIGHT:</span>
                <span className="font-medium">{invoice.grossWeight ? parseFloat(invoice.grossWeight).toFixed(2) : '—'} KG</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">NET WEIGHT:</span>
                <span className="font-medium">{invoice.netWeight ? parseFloat(invoice.netWeight).toFixed(2) : '—'} KG</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">PACKING:</span>
                <span className="font-medium">{invoice.totalCartons || '—'} CTNS</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {parseFloat(invoice.subtotal) > 0 && (
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{invoice.currency} {fmtCur(invoice.subtotal)}</span>
                </div>
              )}
              {parseFloat(invoice.adjustments) !== 0 && (
                <div className="flex justify-between">
                  <span>Adjustments:</span>
                  <span>{invoice.currency} {fmtCur(invoice.adjustments)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-gray-400 pt-2 mt-2">
                <span className="font-bold">INVOICE TOTAL</span>
                <span className="font-bold text-lg">{invoice.currency} {fmtCur(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-xl font-bold">{invoice.currency} {fmtCur(invoice.totalAmount)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Amount Paid</div>
          <div className="text-xl font-bold text-green-600">{invoice.currency} {fmtCur(invoice.amountPaid)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Amount Due</div>
          <div className={`text-xl font-bold ${parseFloat(invoice.amountDue) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {invoice.currency} {fmtCur(invoice.amountDue)}
          </div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-gray-500">Due Date</div>
          <div className="text-lg font-bold">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'TBD (awaiting ROG)'}</div>
        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                  <td className="font-medium text-green-600">{p.currency} {fmtCur(p.amount)}</td>
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
