// src/app/(dashboard)/dashboard/packing-lists/page.js
'use client';

import PageHeader from '@/components/PageHeader';

export default function PackingListsPage() {
  return (
    <div>
      <PageHeader title="Packing Lists" subtitle="Generate and manage packing lists with carton details" />
      <div className="card text-center py-16">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Packing Lists Module</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Packing lists are auto-generated from PO size-color matrices. Navigate to a specific Purchase Order 
          to create and manage its packing list with carton-level details, weights, and CBM calculations.
        </p>
        <a href="/dashboard/purchase-orders" className="btn-primary inline-block mt-4">Go to Purchase Orders →</a>
      </div>
    </div>
  );
}
