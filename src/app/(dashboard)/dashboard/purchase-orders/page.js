// src/app/(dashboard)/dashboard/purchase-orders/page.js
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';

const STORAGE_KEY = 'po-list-hidden-cols';

const ALL_COLUMNS = [
  { key: 'poNo',        label: 'PO#',              isLink: true, alwaysVisible: true,
    render: null },
  { key: 'customer',   label: 'Customer',          render: r => r.customer?.name },
  { key: 'store',      label: 'Store',             render: r => r.store || '—' },
  { key: 'styles',     label: 'Styles',            render: r => {
    const styleNos = [...new Set((r.lineItems || []).map(l => l.style?.styleNo).filter(Boolean))];
    return styleNos.length ? styleNos.join(', ') : '—';
  }},
  { key: 'brand',      label: 'Brand',             render: r => r.brand || '—' },
  { key: 'orderDate',  label: 'Order Date',        render: r => new Date(r.orderDate).toLocaleDateString() },
  { key: 'totalQty',   label: 'Total Qty',         render: r => r.totalQty?.toLocaleString() },
  { key: 'totalAmount',label: 'Amount',            render: r => `${r.currency} ${parseFloat(r.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: 'ihDate',     label: 'Cancel Date (IH)',  render: r => r.ihDate ? new Date(r.ihDate).toLocaleDateString() : '—' },
  { key: 'status',     label: 'Status',            alwaysVisible: true,
    render: r => <StatusBadge status={r.status} /> },
];

export default function PurchaseOrdersPage() {
  const [allPOs, setAllPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);

  // Hidden columns — persisted to localStorage
  const [hiddenCols, setHiddenCols] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  });

  function toggleCol(key) {
    setHiddenCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  // Close picker on outside click
  useEffect(() => {
    function onOutside(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target))
        setColPickerOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // Load all POs once — filtering is done client-side for instant results
  useEffect(() => {
    setLoading(true);
    fetch('/api/purchase-orders')
      .then(r => r.json())
      .then(d => setAllPOs(d.purchaseOrders || []))
      .finally(() => setLoading(false));
  }, []);

  // Instant client-side filtering — no debounce, no network round-trips
  const filteredPOs = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return allPOs.filter(po => {
      if (statusFilter && po.status !== statusFilter) return false;
      if (!q) return true;
      return (
        po.poNo?.toLowerCase().includes(q) ||
        po.store?.toLowerCase().includes(q) ||
        po.brand?.toLowerCase().includes(q) ||
        po.customer?.name?.toLowerCase().includes(q) ||
        po.lineItems?.some(l => l.style?.styleNo?.toLowerCase().includes(q))
      );
    });
  }, [allPOs, statusFilter, searchInput]);

  const visibleColumns = ALL_COLUMNS.filter(c => c.alwaysVisible || !hiddenCols.has(c.key));
  const statuses = ['', 'RECEIVED', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'INVOICED', 'CLOSED', 'CANCELLED'];

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Customer purchase orders" action={{ href: '/dashboard/purchase-orders/new', label: '+ New PO' }} />

      {/* Search bar + Columns picker */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-shrink-0">
          <input
            type="text"
            className="input-field pl-9 w-64"
            placeholder="Search PO#, style, store, brand…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>

        {/* Column picker */}
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setColPickerOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${colPickerOpen ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Columns
            {hiddenCols.size > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{hiddenCols.size}</span>
            )}
          </button>

          {colPickerOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 min-w-[180px]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Show / Hide Columns</p>
              {ALL_COLUMNS.map(col => (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 px-1 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 text-sm ${col.alwaysVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={col.alwaysVisible || !hiddenCols.has(col.key)}
                    disabled={col.alwaysVisible}
                    onChange={() => !col.alwaysVisible && toggleCol(col.key)}
                  />
                  {col.label}
                </label>
              ))}
              {hiddenCols.size > 0 && (
                <button
                  onClick={() => { setHiddenCols(new Set()); localStorage.removeItem(STORAGE_KEY); }}
                  className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 text-center py-1"
                >
                  Reset to default
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading...</div> :
        <DataTable columns={visibleColumns} data={filteredPOs} linkPrefix="/dashboard/purchase-orders" />}
    </div>
  );
}
