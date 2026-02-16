// src/app/(dashboard)/dashboard/inventory/page.js
'use client';

import PageHeader from '@/components/PageHeader';

export default function InventoryPage() {
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Raw materials, WIP, and finished goods stock" />
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Inventory Module</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Track raw material stock from goods receiving, material issues to production, and finished goods.
          Inventory is updated automatically from Supplier PO receiving and production material issues.
        </p>
        <div className="flex gap-3 justify-center mt-4">
          <a href="/dashboard/materials" className="btn-secondary">Materials →</a>
          <a href="/dashboard/supplier-pos" className="btn-secondary">Supplier POs →</a>
        </div>
      </div>
    </div>
  );
}
