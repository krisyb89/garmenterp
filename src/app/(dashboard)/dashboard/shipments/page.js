// src/app/(dashboard)/dashboard/shipments/page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function ShipmentsPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [pos, setPOs] = useState([]);
  const [creating, setCreating] = useState(false);

  function loadShipments() {
    fetch('/api/shipments').then(r => r.json()).then(d => setShipments(d.shipments || [])).finally(() => setLoading(false));
  }

  useEffect(() => { loadShipments(); }, []);

  async function loadPOs() {
    const res = await fetch('/api/purchase-orders');
    const data = await res.json();
    setPOs((data.purchaseOrders || data.pos || []).filter(po => !['CLOSED', 'CANCELLED'].includes(po.status)));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.target);
    const res = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poId: fd.get('poId'),
        shipmentMethod: fd.get('shipmentMethod') || 'SEA_FCL',
        shippingTerms: fd.get('shippingTerms') || 'FOB',
        portOfLoading: fd.get('portOfLoading') || null,
        portOfDischarge: fd.get('portOfDischarge') || null,
        vesselName: fd.get('vesselName') || null,
        containerNo: fd.get('containerNo') || null,
        forwarderName: fd.get('forwarderName') || null,
        etd: fd.get('etd') || null,
        eta: fd.get('eta') || null,
        notes: fd.get('notes') || null,
      }),
    });
    if (res.ok) {
      const shipment = await res.json();
      setShowCreate(false);
      router.push(`/dashboard/shipments/${shipment.id}`);
    }
    setCreating(false);
  }

  const columns = [
    { key: 'shipmentNo', label: 'Shipment#', isLink: true },
    { key: 'po', label: 'PO#', render: r => {
      if (r.po?.poNo) return r.po.poNo;
      if (r.packingLists?.length > 0) {
        const uniquePOs = [...new Set(r.packingLists.map(pl => pl.po?.poNo).filter(Boolean))];
        return uniquePOs.join(', ') || '—';
      }
      return '—';
    }},
    { key: 'customer', label: 'Customer', render: r => {
      if (r.po?.customer?.name) return r.po.customer.name;
      if (r.packingLists?.length > 0) {
        const uniqueCustomers = [...new Set(r.packingLists.map(pl => pl.po?.customer?.name).filter(Boolean))];
        return uniqueCustomers.join(', ') || '—';
      }
      return '—';
    }},
    { key: 'method', label: 'Method', render: r => r.shipmentMethod?.replace(/_/g, ' ') },
    { key: 'terms', label: 'Terms', render: r => r.shippingTerms },
    { key: 'plCount', label: 'Packing Lists', render: r => r.packingLists?.length || 0 },
    { key: 'etd', label: 'ETD', render: r => r.etd ? new Date(r.etd).toLocaleDateString() : '—' },
    { key: 'eta', label: 'ETA', render: r => r.eta ? new Date(r.eta).toLocaleDateString() : '—' },
    { key: 'rog', label: 'ROG', render: r => r.rogDate ? new Date(r.rogDate).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Track all shipments">
        <button className="btn-primary text-sm" onClick={() => { setShowCreate(!showCreate); if (!showCreate) loadPOs(); }}>
          + New Shipment
        </button>
      </PageHeader>

      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-6 space-y-4">
          <h3 className="font-semibold">Create New Shipment</h3>
          <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label-field">Purchase Order (Optional)</label>
              <select name="poId" className="select-field">
                <option value="">— No PO (link via packing lists) —</option>
                {pos.map(po => (
                  <option key={po.id} value={po.id}>{po.poNo} — {po.customer?.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">Shipment Method</label>
              <select name="shipmentMethod" className="select-field">
                <option value="SEA_FCL">Sea FCL</option>
                <option value="SEA_LCL">Sea LCL</option>
                <option value="AIR">Air</option>
                <option value="COURIER">Courier</option>
                <option value="RAIL">Rail</option>
              </select>
            </div>
            <div>
              <label className="label-field">Shipping Terms</label>
              <select name="shippingTerms" className="select-field">
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="DDP">DDP</option>
                <option value="EXW">EXW</option>
              </select>
            </div>
            <div>
              <label className="label-field">Forwarder</label>
              <input name="forwarderName" className="input-field" placeholder="Forwarder name" />
            </div>
            <div>
              <label className="label-field">Port of Loading</label>
              <input name="portOfLoading" className="input-field" placeholder="e.g. Shanghai" />
            </div>
            <div>
              <label className="label-field">Port of Discharge</label>
              <input name="portOfDischarge" className="input-field" placeholder="e.g. Los Angeles" />
            </div>
            <div>
              <label className="label-field">ETD</label>
              <input name="etd" type="date" className="input-field" />
            </div>
            <div>
              <label className="label-field">ETA</label>
              <input name="eta" type="date" className="input-field" />
            </div>
            <div>
              <label className="label-field">Vessel Name</label>
              <input name="vesselName" className="input-field" placeholder="Vessel name" />
            </div>
            <div>
              <label className="label-field">Container No.</label>
              <input name="containerNo" className="input-field" placeholder="Container number" />
            </div>
            <div className="lg:col-span-2">
              <label className="label-field">Notes</label>
              <input name="notes" className="input-field" placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={creating}>{creating ? 'Creating...' : 'Create Shipment'}</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={shipments} linkPrefix="/dashboard/shipments" />}
    </div>
  );
}
