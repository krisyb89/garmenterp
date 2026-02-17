// src/app/(dashboard)/dashboard/packing-lists/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function PackingListsPage() {
  const [packingLists, setPackingLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/packing-lists')
      .then(r => r.json())
      .then(d => setPackingLists(d.packingLists || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  const totalCartons = packingLists.reduce((sum, pl) => sum + (pl.totalCartons || pl.cartons?.length || 0), 0);
  const totalQty = packingLists.reduce((sum, pl) => sum + (pl.totalQty || 0), 0);

  return (
    <div>
      <PageHeader title="Packing Lists" subtitle="All packing lists across purchase orders" />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Packing Lists</p>
          <p className="text-2xl font-bold">{packingLists.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Cartons</p>
          <p className="text-2xl font-bold">{totalCartons}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Pieces</p>
          <p className="text-2xl font-bold">{totalQty.toLocaleString()}</p>
        </div>
      </div>

      {packingLists.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-3">No packing lists yet. Packing lists are created from individual Purchase Orders.</p>
          <Link href="/dashboard/purchase-orders" className="btn-primary inline-block">Go to Purchase Orders</Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>PL #</th>
                  <th>Purchase Order</th>
                  <th>Cartons</th>
                  <th>Total Qty</th>
                  <th>Gross Weight (KG)</th>
                  <th>CBM</th>
                  <th>Shipment</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {packingLists.map(pl => (
                  <tr key={pl.id}>
                    <td>
                      <Link href={`/dashboard/purchase-orders/${pl.poId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {pl.packingListNo}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/dashboard/purchase-orders/${pl.poId}`} className="text-blue-600 hover:text-blue-800">
                        {pl.po?.poNo || '—'}
                      </Link>
                    </td>
                    <td>{pl.totalCartons || pl.cartons?.length || 0}</td>
                    <td>{(pl.totalQty || 0).toLocaleString()}</td>
                    <td>{parseFloat(pl.totalGrossWeight || 0).toFixed(2)}</td>
                    <td>{parseFloat(pl.totalCBM || 0).toFixed(3)}</td>
                    <td>{pl.shipmentId ? 'Linked' : '—'}</td>
                    <td>{new Date(pl.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
