// src/components/StatusBadge.js

const statusColors = {
  // SRS statuses
  RECEIVED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  COSTING_IN_PROGRESS: 'bg-orange-100 text-orange-700',
  QUOTED: 'bg-purple-100 text-purple-700',
  CUSTOMER_CONFIRMED: 'bg-green-100 text-green-700',
  DEVELOPMENT_STARTED: 'bg-teal-100 text-teal-700',
  ORDER_RECEIVED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',

  // PO statuses
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PRODUCTION: 'bg-yellow-100 text-yellow-700',
  PARTIALLY_SHIPPED: 'bg-orange-100 text-orange-700',
  FULLY_SHIPPED: 'bg-green-100 text-green-700',
  INVOICED: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-gray-100 text-gray-700',

  // Sample statuses
  PENDING: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  APPROVED_WITH_COMMENTS: 'bg-amber-100 text-amber-700',
  RESUBMIT: 'bg-orange-100 text-orange-700',

  // Production statuses
  PLANNED: 'bg-gray-100 text-gray-600',
  MATERIAL_ISSUED: 'bg-blue-100 text-blue-700',
  CUTTING: 'bg-yellow-100 text-yellow-700',
  SEWING: 'bg-orange-100 text-orange-700',
  WASHING_FINISHING: 'bg-purple-100 text-purple-700',
  QC_INSPECTION: 'bg-teal-100 text-teal-700',
  PACKING: 'bg-indigo-100 text-indigo-700',
  READY_TO_SHIP: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',

  // Shipment
  BOOKING_MADE: 'bg-blue-100 text-blue-700',
  CARGO_READY: 'bg-yellow-100 text-yellow-700',
  LOADED: 'bg-orange-100 text-orange-700',
  IN_TRANSIT: 'bg-purple-100 text-purple-700',
  ARRIVED: 'bg-teal-100 text-teal-700',
  CUSTOMS_CLEARED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',

  // Invoice
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  ACKNOWLEDGED: 'bg-purple-100 text-purple-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  FULLY_PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',

  // QC
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  CONDITIONAL_PASS: 'bg-yellow-100 text-yellow-700',

  // Supplier PO
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-700',
  FULLY_RECEIVED: 'bg-green-100 text-green-700',
};

export default function StatusBadge({ status }) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-600';
  const display = status?.replace(/_/g, ' ') || 'Unknown';
  
  return (
    <span className={`status-badge ${colorClass}`}>
      {display}
    </span>
  );
}
