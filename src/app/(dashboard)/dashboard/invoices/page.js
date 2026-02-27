// src/app/(dashboard)/dashboard/invoices/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [shipments, setShipments] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/invoices?${params}`).then(r => r.json()).then(d => setInvoices(d.invoices || [])).finally(() => setLoading(false));
  }, [statusFilter]);

  async function loadShipments() {
    const res = await fetch('/api/shipments');
    const data = await res.json();
    setShipments(data.shipments || []);
  }

  async function createFromShipment(e) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.target);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipmentId: fd.get('shipmentId'),
        shipperName: fd.get('shipperName') || undefined,
        consigneeName: fd.get('consigneeName') || undefined,
        countryOfOrigin: fd.get('countryOfOrigin') || 'China',
        incoterms: fd.get('incoterms') || undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      // Reload
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const d = await fetch(`/api/invoices?${params}`).then(r => r.json());
      setInvoices(d.invoices || []);
    }
    setCreating(false);
  }

  const columns = [
    { key: 'invoiceNo', label: 'Invoice#', isLink: true },
    { key: 'customer', label: 'Customer', render: r => r.customer?.name },
    { key: 'source', label: 'Source', render: r => r.shipment?.shipmentNo ? `Shipment: ${r.shipment.shipmentNo}` : r.po?.poNo ? `PO: ${r.po.poNo}` : '—' },
    { key: 'invoiceDate', label: 'Date', render: r => new Date(r.invoiceDate).toLocaleDateString() },
    { key: 'totalAmount', label: 'Total', render: r => `${r.currency} ${parseFloat(r.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'amountPaid', label: 'Paid', render: r => `${r.currency} ${parseFloat(r.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'amountDue', label: 'Due', render: r => `${r.currency} ${parseFloat(r.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { key: 'dueDate', label: 'Due Date', render: r => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Customer Invoices" subtitle="Manage invoicing and accounts receivable">
        <button className="btn-primary text-sm" onClick={() => { setShowCreate(!showCreate); if (!showCreate) loadShipments(); }}>
          + Generate Invoice
        </button>
      </PageHeader>

      {/* Create from Shipment Form */}
      {showCreate && (
        <form onSubmit={createFromShipment} className="card mb-6 space-y-4">
          <h3 className="font-semibold">Generate Invoice from Shipment</h3>
          <p className="text-sm text-gray-500">Select a shipment to auto-generate invoice line items from all packing lists.</p>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Shipment *</label>
              <select name="shipmentId" className="select-field" required>
                <option value="">Select shipment...</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shipmentNo} — {s.po?.poNo} ({s.po?.customer?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Shipper Name</label>
              <input name="shipperName" className="input-field" placeholder="e.g. OHO Global Ltd" />
            </div>
            <div>
              <label className="label-field">Consignee Name</label>
              <input name="consigneeName" className="input-field" placeholder="Auto-filled from customer" />
            </div>
            <div>
              <label className="label-field">Country of Origin</label>
              <input name="countryOfOrigin" className="input-field" defaultValue="China" />
            </div>
            <div>
              <label className="label-field">Incoterms</label>
              <select name="incoterms" className="select-field">
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="DDP">DDP</option>
                <option value="EXW">EXW</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={creating}>{creating ? 'Generating...' : 'Generate Invoice'}</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'DRAFT', 'SENT', 'PARTIALLY_PAID', 'FULLY_PAID', 'OVERDUE'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={invoices} linkPrefix="/dashboard/invoices" />}
    </div>
  );
}
