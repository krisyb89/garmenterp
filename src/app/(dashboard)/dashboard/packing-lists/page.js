// src/app/(dashboard)/dashboard/packing-lists/page.js
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';

const SIZE_ORDER = ['XXS','XS','S','M','L','XL','2XL','XXL','3XL','XXXL','4XL','5XL'];

const sortSizeEntries = (entries) => {
  return [...entries].sort(([a], [b]) => {
    const idxA = SIZE_ORDER.indexOf(a);
    const idxB = SIZE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
};

function consolidateCartons(cartonList) {
  if (!cartonList || cartonList.length === 0) return [];
  const getKey = (c) => [
    c.styleNo, c.color, c.dcName || '', c.packType || '',
    JSON.stringify(c.sizeBreakdown || {}),
    c.totalPcs, c.grossWeight,
    c.length, c.width, c.height
  ].join('|');

  const groups = [];
  let current = null;
  for (const c of cartonList) {
    const key = getKey(c);
    if (current && current.key === key) {
      current.endNo = c.cartonNo;
      current.count++;
    } else {
      if (current) groups.push(current);
      current = { ...c, key, startNo: c.cartonNo, endNo: c.cartonNo, count: 1 };
    }
  }
  if (current) groups.push(current);
  return groups;
}

export default function PackingListsPage() {
  const [packingLists, setPackingLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedPL, setExpandedPL] = useState(null);
  const [cartons, setCartons] = useState([]);
  const [cartonsLoading, setCartonsLoading] = useState(false);
  const [expandedDateGroup, setExpandedDateGroup] = useState(null); // null = all expanded by default

  function loadPLs() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/packing-lists?${params}`)
      .then(r => r.json())
      .then(d => setPackingLists(d.packingLists || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPLs(); }, [statusFilter]);

  async function toggleExpand(plId) {
    if (expandedPL === plId) {
      setExpandedPL(null);
      return;
    }
    setExpandedPL(plId);
    setCartonsLoading(true);
    const res = await fetch(`/api/packing-lists/${plId}/cartons`);
    const data = await res.json();
    setCartons(data.cartons || []);
    setCartonsLoading(false);
  }

  async function updatePLStatus(plId, newStatus) {
    await fetch(`/api/packing-lists/${plId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadPLs();
  }

  function isDateGroupExpanded(dateKey) {
    if (expandedDateGroup === null) return true; // all expanded by default
    return !!expandedDateGroup[dateKey];
  }

  function toggleDateGroup(dateKey) {
    setExpandedDateGroup(prev => {
      if (prev === null) {
        // First toggle: collapse this one, keep rest expanded
        const allKeys = [...groupedPLs.scheduled.map(g => g.dateKey), 'UNSCHEDULED'];
        const newState = {};
        allKeys.forEach(k => { newState[k] = k !== dateKey; });
        return newState;
      }
      return { ...prev, [dateKey]: !prev[dateKey] };
    });
  }

  // Memoized grouping by exFtyDate
  const groupedPLs = useMemo(() => {
    const groups = {};
    const scheduled = [];
    const unscheduled = [];

    for (const pl of packingLists) {
      if (pl.exFtyDate) {
        const dateKey = new Date(pl.exFtyDate).toISOString().split('T')[0];
        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: new Date(pl.exFtyDate),
            dateKey,
            pls: [],
            totalCartons: 0,
            totalPcs: 0
          };
        }
        groups[dateKey].pls.push(pl);
        groups[dateKey].totalCartons += pl.totalCartons || 0;
        groups[dateKey].totalPcs += pl.totalQty || 0;
        scheduled.push(pl);
      } else {
        unscheduled.push(pl);
      }
    }

    const sortedScheduled = Object.values(groups)
      .sort((a, b) => a.date - b.date);

    return { scheduled: sortedScheduled, unscheduled };
  }, [packingLists]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  const totalCartons = packingLists.reduce((sum, pl) => sum + (pl.totalCartons || pl.cartons?.length || 0), 0);
  const totalQty = packingLists.reduce((sum, pl) => sum + (pl.totalQty || 0), 0);
  const pendingReview = packingLists.filter(pl => pl.status === 'PENDING_REVIEW').length;
  const assignedToShipment = packingLists.filter(pl => pl.shipment).length;
  const unassigned = packingLists.filter(pl => !pl.shipment).length;

  return (
    <div>
      <PageHeader title="Packing Lists" subtitle="All packing lists across purchase orders"
        action={{ href: '/dashboard/packing-lists/create', label: '+ New Packing List' }} />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
        <div className="card">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className={`text-2xl font-bold ${pendingReview > 0 ? 'text-orange-600' : 'text-green-600'}`}>{pendingReview}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Assigned</p>
          <p className="text-2xl font-bold text-blue-600">{assignedToShipment}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Unassigned</p>
          <p className="text-2xl font-bold text-gray-600">{unassigned}</p>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
      </div>

      {packingLists.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-3">No packing lists found. Use the mobile packing wizard at <code className="bg-gray-100 px-1.5 py-0.5 rounded">/packing</code> to create packing lists.</p>
          <Link href="/dashboard/purchase-orders" className="btn-primary inline-block">Go to Purchase Orders</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Scheduled by Ex-Factory Date */}
          {groupedPLs.scheduled.map(dateGroup => (
            <div key={dateGroup.dateKey}>
              {/* Date Group Header - Collapsible */}
              <div
                onClick={() => toggleDateGroup(dateGroup.dateKey)}
                className="bg-gray-100 border-l-4 border-blue-500 p-4 rounded-lg cursor-pointer hover:bg-gray-150 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{isDateGroupExpanded(dateGroup.dateKey) ? '▼' : '▶'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {dateGroup.date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </h3>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{dateGroup.pls.length}</span> packing lists |{' '}
                  <span className="font-medium">{dateGroup.totalCartons}</span> ctns |{' '}
                  <span className="font-medium">{dateGroup.totalPcs.toLocaleString()}</span> pcs
                </div>
              </div>

              {/* Date Group Content - Collapsible */}
              {isDateGroupExpanded(dateGroup.dateKey) && (
                <div className="space-y-2 mt-2">
                  {dateGroup.pls.map(pl => (
                    <PLCard
                      key={pl.id}
                      pl={pl}
                      isExpanded={expandedPL === pl.id}
                      onToggleExpand={() => toggleExpand(pl.id)}
                      cartons={cartons}
                      cartonsLoading={cartonsLoading}
                      onUpdateStatus={(newStatus) => updatePLStatus(pl.id, newStatus)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Unscheduled Group */}
          {groupedPLs.unscheduled.length > 0 && (
            <div>
              <div
                onClick={() => toggleDateGroup('UNSCHEDULED')}
                className="bg-gray-100 border-l-4 border-gray-400 p-4 rounded-lg cursor-pointer hover:bg-gray-150 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{isDateGroupExpanded('UNSCHEDULED') ? '▼' : '▶'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">Unscheduled</h3>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{groupedPLs.unscheduled.length}</span> packing lists |{' '}
                  <span className="font-medium">{groupedPLs.unscheduled.reduce((sum, pl) => sum + (pl.totalCartons || 0), 0)}</span> ctns |{' '}
                  <span className="font-medium">{groupedPLs.unscheduled.reduce((sum, pl) => sum + (pl.totalQty || 0), 0).toLocaleString()}</span> pcs
                </div>
              </div>

              {isDateGroupExpanded('UNSCHEDULED') && (
                <div className="space-y-2 mt-2">
                  {groupedPLs.unscheduled.map(pl => (
                    <PLCard
                      key={pl.id}
                      pl={pl}
                      isExpanded={expandedPL === pl.id}
                      onToggleExpand={() => toggleExpand(pl.id)}
                      cartons={cartons}
                      cartonsLoading={cartonsLoading}
                      onUpdateStatus={(newStatus) => updatePLStatus(pl.id, newStatus)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PLCard({ pl, isExpanded, onToggleExpand, cartons, cartonsLoading, onUpdateStatus }) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* PL Header Row */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1">
            <Link
              href={`/dashboard/packing-lists/${pl.id}`}
              className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
              onClick={e => e.stopPropagation()}
            >
              {pl.packingListNo}
            </Link>
            <div className="text-sm text-gray-500 mt-1">
              PO:{' '}
              <Link
                href={`/dashboard/purchase-orders/${pl.poId}`}
                className="text-blue-600 hover:text-blue-800"
                onClick={e => e.stopPropagation()}
              >
                {pl.po?.poNo || '—'}
              </Link>
              {' '} | {pl.po?.customer?.name}
            </div>
          </div>

          {/* Shipment Badge */}
          <div className="flex-shrink-0">
            {pl.shipment ? (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded">
                {pl.shipment.shipmentNo}
              </span>
            ) : (
              <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded">
                Unassigned
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm hidden sm:block">
            <div><span className="text-gray-500">Cartons:</span> <span className="font-medium">{pl.totalCartons || 0}</span></div>
            <div><span className="text-gray-500">Pcs:</span> <span className="font-medium">{(pl.totalQty || 0).toLocaleString()}</span></div>
          </div>
          <div className="text-right text-sm hidden md:block">
            <div><span className="text-gray-500">GW:</span> <span className="font-medium">{parseFloat(pl.totalGrossWeight || 0).toFixed(1)} kg</span></div>
            <div><span className="text-gray-500">CBM:</span> <span className="font-medium">{parseFloat(pl.totalCBM || 0).toFixed(3)}</span></div>
          </div>
          <StatusBadge status={pl.status || 'IN_PROGRESS'} />
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded: Carton Detail + Review Actions */}
      {isExpanded && (
        <div className="border-t bg-gray-50 p-4">
          {/* Review actions */}
          {pl.status === 'PENDING_REVIEW' && (
            <div className="flex gap-2 mb-4">
              <button onClick={() => onUpdateStatus('APPROVED')} className="btn-success text-sm">Approve</button>
              <button onClick={() => onUpdateStatus('REJECTED')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">Reject</button>
            </div>
          )}
          {pl.status === 'REJECTED' && (
            <div className="flex gap-2 mb-4">
              <button onClick={() => onUpdateStatus('IN_PROGRESS')} className="btn-primary text-sm">Reopen for Editing</button>
            </div>
          )}

          {cartonsLoading ? (
            <div className="text-center py-4 text-gray-400">Loading cartons...</div>
          ) : cartons.length === 0 ? (
            <div className="text-center py-4 text-gray-400">No cartons recorded</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base text-sm">
                <thead>
                  <tr>
                    <th>Ctn#</th>
                    <th>Style</th>
                    <th>Color</th>
                    <th>DC</th>
                    <th>Type</th>
                    <th>Sizes</th>
                    <th>Pcs/Ctn</th>
                    <th>Total Pcs</th>
                    <th>GW (kg)</th>
                    <th>Dims (cm)</th>
                    <th>CBM</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidateCartons(cartons).map((row, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">
                        {row.startNo === row.endNo ? row.startNo : (
                          <span>{row.startNo} - {row.endNo} <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px' }}>×{row.count}</span></span>
                        )}
                      </td>
                      <td>{row.styleNo}</td>
                      <td>{row.color}</td>
                      <td>{row.dcName || '—'}</td>
                      <td><span className={`text-xs px-1.5 py-0.5 rounded ${row.packType === 'PREPACK' ? 'bg-purple-100 text-purple-700' : row.packType === 'MIXED' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{row.packType || 'SINGLE'}</span></td>
                      <td className="text-xs">
                        {row.sizeBreakdown && typeof row.sizeBreakdown === 'object'
                          ? sortSizeEntries(Object.entries(row.sizeBreakdown)).filter(([, v]) => v > 0).map(([sz, q]) => `${sz}:${q}`).join(' ')
                          : '—'}
                      </td>
                      <td className="font-medium">{row.totalPcs}</td>
                      <td className="font-medium" style={{ fontWeight: '600' }}>{(row.totalPcs * row.count).toLocaleString()}</td>
                      <td>{parseFloat(row.grossWeight || 0).toFixed(1)}</td>
                      <td className="text-xs">{row.length && row.width && row.height ? `${Number(row.length)}×${Number(row.width)}×${Number(row.height)}` : '—'}</td>
                      <td>{parseFloat(row.cbm || 0).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary by style/color/DC */}
              <div className="mt-4 bg-white rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Summary</h4>
                {(() => {
                  const groups = {};
                  for (const c of cartons) {
                    const key = `${c.styleNo}|${c.color}|${c.dcName || '—'}`;
                    if (!groups[key]) groups[key] = { styleNo: c.styleNo, color: c.color, dc: c.dcName || '—', cartons: 0, pcs: 0 };
                    groups[key].cartons += 1;
                    groups[key].pcs += c.totalPcs;
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.values(groups).map((g, i) => (
                        <div key={i} className="text-sm bg-gray-50 rounded p-2">
                          <span className="font-medium">{g.styleNo}</span> <span className="text-gray-500">{g.color}</span>
                          {g.dc !== '—' && <span className="text-gray-400"> → {g.dc}</span>}
                          <div className="text-xs text-gray-500">{g.cartons} ctns | {g.pcs.toLocaleString()} pcs</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
