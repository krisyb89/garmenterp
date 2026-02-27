// src/components/ListWidget.js
'use client';

import Link from 'next/link';
import StatusBadge from './StatusBadge';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// Render a single PO item
function POItem({ item }) {
  return (
    <Link
      href={`/dashboard/purchase-orders/${item.id}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div>
        <span className="font-medium text-sm">{item.poNo}</span>
        <span className="text-gray-400 text-sm ml-2">{item.customer?.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {item.totalQty?.toLocaleString()} pcs
        </span>
        <StatusBadge status={item.status} />
      </div>
    </Link>
  );
}

// Render a single SRS item
function SRSItem({ item }) {
  return (
    <Link
      href={`/dashboard/srs/${item.id}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div>
        <span className="font-medium text-sm">{item.styleNo || item.srsNo}</span>
        <span className="text-gray-400 text-sm ml-2">{item.customer?.name}</span>
      </div>
      <StatusBadge status={item.status} />
    </Link>
  );
}

// Render a single WIP item
function WIPItem({ item }) {
  return (
    <Link
      href={`/dashboard/wip/srs/${item.srsId}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div>
        <span className="font-medium text-sm">{item.cellName || item.operation}</span>
        <span className="text-gray-400 text-sm ml-2">{item.srs?.styleNo}</span>
      </div>
      <StatusBadge status={item.status} />
    </Link>
  );
}

// Render a single Production Order item
function ProductionItem({ item }) {
  return (
    <Link
      href={`/dashboard/production-orders/${item.id}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div>
        <span className="font-medium text-sm">{item.poNo}</span>
        <span className="text-gray-400 text-sm ml-2">{item.styleNo}</span>
      </div>
      <StatusBadge status={item.status} />
    </Link>
  );
}

// Render a single Shipment item
function ShipmentItem({ item }) {
  return (
    <Link
      href={`/dashboard/shipments/${item.id}`}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div>
        <span className="font-medium text-sm">{item.shipmentNo || item.bookingNo}</span>
        <span className="text-gray-400 text-sm ml-2">{item.destination}</span>
      </div>
      <StatusBadge status={item.status} />
    </Link>
  );
}

// Loading skeleton for list items
function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-3">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Empty state component
function EmptyState({ message }) {
  return (
    <p className="text-gray-400 text-sm py-4 text-center">{message}</p>
  );
}

// Main ListWidget component
export default function ListWidget({ 
  widgetId, 
  title, 
  viewAllLink, 
  data = [], 
  loading = false,
  emptyMessage = 'No items found'
}) {
  // Get the appropriate item renderer based on widget type
  const renderItem = (item) => {
    switch (widgetId) {
      case 'recentPOs':
        return <POItem key={item.id} item={item} />;
      case 'recentSRS':
        return <SRSItem key={item.id} item={item} />;
      case 'pendingWIP':
        return <WIPItem key={item.id} item={item} />;
      case 'activeProduction':
        return <ProductionItem key={item.id} item={item} />;
      case 'recentShipments':
        return <ShipmentItem key={item.id} item={item} />;
      default:
        return <POItem key={item.id} item={item} />;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        {viewAllLink && (
          <Link 
            href={viewAllLink} 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all →
          </Link>
        )}
      </div>
      
      {loading ? (
        <ListSkeleton />
      ) : data.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-1">
          {data.map(renderItem)}
        </div>
      )}
    </div>
  );
}

