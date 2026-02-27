// src/app/(dashboard)/dashboard/purchase-orders/page.js
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

const STORAGE_KEY = 'po-list-hidden-cols';

// 展开 line items 后的列定义
const ALL_COLUMNS = [
  { key: 'poNo',        label: 'PO#',              isLink: true, alwaysVisible: true, sortable: true },
  { key: 'customer',    label: 'Customer',         sortable: true },
  { key: 'store',       label: 'Store',            sortable: true },
  { key: 'style',       label: 'Style',            sortable: true },
  { key: 'color',       label: 'Color',            sortable: true },
  { key: 'qty',         label: 'Qty',              sortable: true, align: 'right' },
  { key: 'unitPrice',   label: 'Unit Price',       sortable: true, align: 'right' },
  { key: 'amount',      label: 'Amount',           sortable: true, align: 'right' },
  { key: 'status',      label: 'Status',           alwaysVisible: true, sortable: true },
  { key: 'brand',       label: 'Brand',            sortable: true },
  { key: 'orderDate',   label: 'Order Date',       sortable: true },
  { key: 'ihDate',      label: 'Cancel Date (IH)', sortable: true },
];

// 将 PO 数据展开为 line item 行
function expandPOsToLineItems(purchaseOrders) {
  const rows = [];
  (purchaseOrders || []).forEach(po => {
    const lineItems = po.lineItems || [];
    if (lineItems.length === 0) {
      // 如果没有 line items，仍然显示一行 PO 基本信息
      rows.push({
        id: po.id,
        poId: po.id,
        poNo: po.poNo,
        customer: po.customer?.name || '—',
        store: po.store || '—',
        brand: po.brand || '—',
        orderDate: po.orderDate,
        ihDate: po.ihDate,
        status: po.status,
        currency: po.currency || 'USD',
        // line item 字段
        lineItemId: null,
        style: '—',
        color: '—',
        qty: 0,
        unitPrice: 0,
        amount: 0,
        // 用于视觉分组
        _isFirstLine: true,
        _lineCount: 0,
        _lineIndex: 0,
      });
    } else {
      lineItems.forEach((line, idx) => {
        rows.push({
          id: `${po.id}-${line.id}`,
          poId: po.id,
          poNo: po.poNo,
          customer: po.customer?.name || '—',
          store: po.store || '—',
          brand: po.brand || '—',
          orderDate: po.orderDate,
          ihDate: po.ihDate,
          status: po.status,
          currency: po.currency || 'USD',
          // line item 字段
          lineItemId: line.id,
          style: line.style?.styleNo || '—',
          color: line.color || '—',
          qty: line.totalQty || 0,
          unitPrice: parseFloat(line.unitPrice || 0),
          amount: parseFloat(line.lineTotal || 0),
          // 用于视觉分组
          _isFirstLine: idx === 0,
          _lineCount: lineItems.length,
          _lineIndex: idx,
        });
      });
    }
  });
  return rows;
}

// 排序函数
function sortData(data, sortKey, sortOrder) {
  if (!sortKey) return data;
  
  return [...data].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    
    // 处理字符串比较
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    // 处理日期比较
    if (sortKey === 'orderDate' || sortKey === 'ihDate') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    
    if (aVal === bVal) return 0;
    
    const comparison = aVal < bVal ? -1 : 1;
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// 排序图标组件
function SortIcon({ sortKey, currentSortKey, sortOrder }) {
  if (sortKey !== currentSortKey) {
    return <span className="text-gray-300 ml-1">↕</span>;
  }
  return (
    <span className="text-blue-600 ml-1">
      {sortOrder === 'asc' ? '▲' : '▼'}
    </span>
  );
}

export default function PurchaseOrdersPage() {
  const [allPOs, setAllPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);
  
  // 排序状态
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

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

  // 处理排序点击
  function handleSort(key) {
    if (!key) return;
    if (sortKey === key) {
      // 切换排序方向
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新排序列，默认升序
      setSortKey(key);
      setSortOrder('asc');
    }
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

  // 展开为 line item 行
  const expandedRows = useMemo(() => {
    return expandPOsToLineItems(allPOs);
  }, [allPOs]);

  // Instant client-side filtering — no debounce, no network round-trips
  const filteredRows = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return expandedRows.filter(row => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.poNo?.toLowerCase().includes(q) ||
        row.store?.toLowerCase().includes(q) ||
        row.brand?.toLowerCase().includes(q) ||
        row.customer?.toLowerCase().includes(q) ||
        row.style?.toLowerCase().includes(q) ||
        row.color?.toLowerCase().includes(q)
      );
    });
  }, [expandedRows, statusFilter, searchInput]);

  // 排序
  const sortedRows = useMemo(() => {
    return sortData(filteredRows, sortKey, sortOrder);
  }, [filteredRows, sortKey, sortOrder]);

  const visibleColumns = ALL_COLUMNS.filter(c => c.alwaysVisible || !hiddenCols.has(c.key));
  const statuses = ['', 'RECEIVED', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'INVOICED', 'CLOSED', 'CANCELLED'];

  // 渲染单元格内容
  function renderCell(row, col) {
    switch (col.key) {
      case 'poNo':
        return row.poNo;
      case 'customer':
        return row.customer;
      case 'store':
        return row.store || '—';
      case 'style':
        return row.style || '—';
      case 'color':
        return row.color || '—';
      case 'qty':
        return row.qty?.toLocaleString() || '0';
      case 'unitPrice':
        return row.unitPrice ? `${row.currency} ${row.unitPrice.toFixed(2)}` : '—';
      case 'amount':
        return row.amount ? `${row.currency} ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
      case 'status':
        return <StatusBadge status={row.status} />;
      case 'brand':
        return row.brand || '—';
      case 'orderDate':
        return row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '—';
      case 'ihDate':
        return row.ihDate ? new Date(row.ihDate).toLocaleDateString() : '—';
      default:
        return row[col.key] ?? '—';
    }
  }

  // 获取行的视觉分组样式
  function getRowClassName(row, index) {
    const baseClasses = "cursor-pointer transition-colors";
    
    // 使用交替的背景色来区分不同的 PO
    // 找到当前行属于第几个 PO（通过 poId 变化来判断）
    let poGroupIndex = 0;
    for (let i = 0; i < index; i++) {
      if (sortedRows[i].poId !== sortedRows[i + 1]?.poId) {
        poGroupIndex++;
      }
    }
    
    // 使用不同的背景色来区分 PO 组
    const bgClass = poGroupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
    
    // 如果是同一 PO 的多行，添加左边框标识
    const borderClass = row._lineCount > 1 && !row._isFirstLine 
      ? 'border-l-2 border-l-blue-200' 
      : '';
    
    // 第一行添加顶部边框
    const topBorderClass = row._isFirstLine ? 'border-t border-gray-200' : '';
    
    return `${baseClasses} ${bgClass} ${borderClass} ${topBorderClass}`;
  }

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

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : sortedRows.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No records found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  {visibleColumns.map((col) => (
                    <th 
                      key={col.key} 
                      style={col.width ? { width: col.width } : {}}
                      className={col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className={`flex items-center ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                        {col.label}
                        {col.sortable && (
                          <SortIcon 
                            sortKey={col.key} 
                            currentSortKey={sortKey} 
                            sortOrder={sortOrder} 
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className={getRowClassName(row, index)}
                  >
                    {visibleColumns.map((col) => (
                      <td 
                        key={col.key}
                        className={col.align === 'right' ? 'text-right' : ''}
                      >
                        {col.isLink ? (
                          <Link
                            href={`/dashboard/purchase-orders/${row.poId}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {renderCell(row, col)}
                          </Link>
                        ) : (
                          renderCell(row, col)
                        )}
                      </td>
                    ))}
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
