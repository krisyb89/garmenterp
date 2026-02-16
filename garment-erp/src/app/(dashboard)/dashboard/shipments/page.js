// src/app/(dashboard)/dashboard/shipments/page.js
'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shipments').then(r => r.json()).then(d => setShipments(d.shipments || [])).finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'shipmentNo', label: 'Shipment#', isLink: true },
    { key: 'po', label: 'PO#', render: r => r.po?.poNo },
    { key: 'customer', label: 'Customer', render: r => r.po?.customer?.name },
    { key: 'method', label: 'Method', render: r => r.shipmentMethod?.replace(/_/g, ' ') },
    { key: 'terms', label: 'Terms', render: r => r.shippingTerms },
    { key: 'etd', label: 'ETD', render: r => r.etd ? new Date(r.etd).toLocaleDateString() : '—' },
    { key: 'eta', label: 'ETA', render: r => r.eta ? new Date(r.eta).toLocaleDateString() : '—' },
    { key: 'rog', label: 'ROG', render: r => r.rogDate ? new Date(r.rogDate).toLocaleDateString() : '—' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Track all shipments" />
      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={columns} data={shipments} linkPrefix="/dashboard/shipments" />}
    </div>
  );
}
