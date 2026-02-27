// src/app/(dashboard)/dashboard/inventory/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory').then(r => r.json()),
      fetch('/api/inventory/movements?limit=20').then(r => r.json()),
    ])
      .then(([invData, movData]) => {
        setInventory(invData.items || []);
        setMovements(movData.movements || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const locations = [...new Set(inventory.map(i => i.location).filter(Boolean))];

  const filtered = inventory.filter(item => {
    const matchSearch = !search ||
      item.material?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.material?.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.color?.toLowerCase().includes(search.toLowerCase());
    const matchLocation = !locationFilter || item.location === locationFilter;
    return matchSearch && matchLocation;
  });

  const totalItems = filtered.length;
  const totalQty = filtered.reduce((sum, i) => sum + parseFloat(i.quantity || 0), 0);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Raw materials, WIP, and finished goods stock" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-2xl font-bold">{totalQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Locations</p>
          <p className="text-2xl font-bold">{locations.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder="Search by material or color..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input-field max-w-xs" value={locationFilter} onChange={e => setLocationFilter(e.target.value)}>
          <option value="">All Locations</option>
          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      {/* Inventory table */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No inventory records found. Stock is updated automatically from Supplier PO receiving and production material issues.</p>
          <div className="flex gap-3 justify-center mt-4">
            <a href="/dashboard/materials" className="btn-secondary">Materials</a>
            <a href="/dashboard/supplier-pos" className="btn-secondary">Supplier POs</a>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Material Code</th>
                  <th>Material Name</th>
                  <th>Color</th>
                  <th>Lot #</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.material?.code || '—'}</td>
                    <td>{item.material?.name || '—'}</td>
                    <td>{item.color || '—'}</td>
                    <td>{item.lotNo || '—'}</td>
                    <td>{item.location}</td>
                    <td className="font-medium">{parseFloat(item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent movements */}
      {movements.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-4">Recent Stock Movements</h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${
                        m.type === 'IN' ? 'bg-green-100 text-green-700' :
                        m.type === 'OUT' ? 'bg-red-100 text-red-700' :
                        m.type === 'TRANSFER' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{m.type}</span>
                    </td>
                    <td>{m.inventoryItem?.material?.name || '—'}</td>
                    <td>{parseFloat(m.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>{m.fromLocation || '—'}</td>
                    <td>{m.toLocation || '—'}</td>
                    <td>{m.reference || '—'}</td>
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
