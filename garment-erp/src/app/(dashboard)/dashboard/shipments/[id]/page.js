// src/app/(dashboard)/dashboard/shipments/[id]/page.js
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const SHIP_STATUSES = ['BOOKING_MADE','CARGO_READY','LOADED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];

export default function ShipmentDetailPage() {
  const { id } = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shipments/${id}`).then(r => r.json()).then(setShipment).finally(() => setLoading(false));
  }, [id]);

  async function updateField(data) {
    const res = await fetch(`/api/shipments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const updated = await res.json();
    setShipment(prev => ({ ...prev, ...updated }));
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!shipment) return <div className="text-center py-20 text-red-500">Not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/shipments" className="text-sm text-blue-600 mb-2 inline-block">← Shipments</Link>
          <h1 className="text-2xl font-bold">{shipment.shipmentNo}</h1>
          <p className="text-gray-500 text-sm">PO: {shipment.po?.poNo} | {shipment.po?.customer?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={shipment.status} />
          <select className="select-field w-auto text-sm" value={shipment.status} onChange={e => updateField({ status: e.target.value })}>
            {SHIP_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Shipment Pipeline */}
      <div className="card mb-6">
        <div className="flex gap-1">
          {SHIP_STATUSES.map(s => {
            const idx = SHIP_STATUSES.indexOf(s);
            const currentIdx = SHIP_STATUSES.indexOf(shipment.status);
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={s} className={`flex-1 py-2 text-center text-xs font-medium rounded
                ${isCurrent ? 'bg-blue-500 text-white' : isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {s.replace(/_/g, ' ')}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Shipping Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Method</dt><dd>{shipment.shipmentMethod?.replace(/_/g, ' ')}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Terms</dt><dd>{shipment.shippingTerms}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Port of Loading</dt><dd>{shipment.portOfLoading || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Port of Discharge</dt><dd>{shipment.portOfDischarge || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Vessel</dt><dd>{shipment.vesselName || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Container#</dt><dd>{shipment.containerNo || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">B/L#</dt><dd>{shipment.blNo || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Forwarder</dt><dd>{shipment.forwarderName || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Freight Cost</dt><dd>{shipment.freightCost ? `$${parseFloat(shipment.freightCost).toFixed(2)}` : '—'}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Key Dates</h2>
          <div className="space-y-3">
            {[
              { label: 'ETD (Est. Departure)', field: 'etd' },
              { label: 'ATD (Actual Departure)', field: 'atd' },
              { label: 'ETA (Est. Arrival)', field: 'eta' },
              { label: 'ATA (Actual Arrival)', field: 'ata' },
              { label: 'ROG (Receipt of Goods)', field: 'rogDate' },
            ].map(({ label, field }) => (
              <div key={field} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <input
                  type="date" className="input-field w-auto text-sm"
                  value={shipment[field] ? new Date(shipment[field]).toISOString().split('T')[0] : ''}
                  onChange={e => updateField({ [field]: e.target.value || null })}
                />
              </div>
            ))}
          </div>
          {shipment.rogDate && (
            <div className="mt-4 bg-green-50 rounded-lg p-3 text-sm text-green-700">
              <strong>ROG recorded:</strong> Payment due date will be calculated based on customer terms.
            </div>
          )}
        </div>

        {/* Packing Lists */}
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Packing Lists</h2>
          {shipment.packingLists?.length === 0 ? (
            <p className="text-sm text-gray-400">No packing lists linked</p>
          ) : (
            <table className="table-base">
              <thead><tr><th>PL#</th><th>Cartons</th><th>Qty</th></tr></thead>
              <tbody>
                {shipment.packingLists?.map(pl => (
                  <tr key={pl.id}>
                    <td className="font-medium">{pl.packingListNo}</td>
                    <td>{pl.totalCartons}</td>
                    <td>{pl.totalQty?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
