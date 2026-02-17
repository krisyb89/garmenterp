// src/app/(dashboard)/dashboard/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async r => {
        const json = await r.json();
        if (!r.ok) {
          console.error('Dashboard API error:', json);
          throw new Error(json.error || 'Failed to load dashboard');
        }
        return json;
      })
      .then(setData)
      .catch(err => {
        console.error('Dashboard error:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>;

  if (error || !data || !data.stats) {
    return (
      <div className="text-center py-20">
        <div className="text-red-500 mb-4">Failed to load dashboard</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  const { stats, recentPOs = [], recentSRS = [] } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active Customers" value={stats.customerCount} icon="🏢" color="blue" />
        <StatCard title="Active SRS" value={stats.activeSRS} icon="📋" color="purple" subtitle="In pipeline" />
        <StatCard title="Active POs" value={stats.activePOs} icon="📦" color="green" subtitle="Open orders" />
        <StatCard title="In Production" value={stats.inProductionCount} icon="⚙️" color="yellow" />
        <StatCard title="Pending Samples" value={stats.pendingSamples} icon="🧵" color="orange" />
        <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon="✅" color="red" subtitle="Need attention" />
        <StatCard title="Active Shipments" value={stats.pendingShipments} icon="🚢" color="blue" />
        <StatCard title="Overdue Invoices" value={stats.overdueInvoices} icon="⚠️" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent POs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Purchase Orders</h2>
            <Link href="/dashboard/purchase-orders" className="text-sm text-blue-600 hover:text-blue-800">
              View all →
            </Link>
          </div>
          {recentPOs.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No purchase orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentPOs.map(po => (
                <Link
                  key={po.id}
                  href={`/dashboard/purchase-orders/${po.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-sm">{po.poNo}</span>
                    <span className="text-gray-400 text-sm ml-2">{po.customer?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {po.totalQty?.toLocaleString()} pcs
                    </span>
                    <StatusBadge status={po.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent SRS */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Development Requests</h2>
            <Link href="/dashboard/srs" className="text-sm text-blue-600 hover:text-blue-800">
              View all →
            </Link>
          </div>
          {recentSRS.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No SRS yet</p>
          ) : (
            <div className="space-y-3">
              {recentSRS.map(srs => (
                <Link
                  key={srs.id}
                  href={`/dashboard/srs/${srs.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-sm">{srs.srsNo}</span>
                    <span className="text-gray-400 text-sm ml-2">{srs.customer?.name}</span>
                  </div>
                  <StatusBadge status={srs.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
