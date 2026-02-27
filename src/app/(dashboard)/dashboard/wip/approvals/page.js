// src/app/(dashboard)/dashboard/wip/approvals/page.js
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

// ── Segment / column definitions ─────────────────────────────────────────────

const SEGMENTS = [
  {
    key: 'SAMPLES',
    label: 'Samples',
    colour: 'purple',
    types: ['PROTO', 'FIT', 'PP', 'TOP', 'GPT', 'SHIPMENT_SAMPLE'],
    bg: 'bg-purple-50',
    headerBg: 'bg-purple-100',
    text: 'text-purple-700',
  },
  {
    key: 'FABRICS',
    label: 'Fabrics',
    colour: 'amber',
    types: ['FABRIC'],
    bg: 'bg-amber-50',
    headerBg: 'bg-amber-100',
    text: 'text-amber-700',
  },
  {
    key: 'COLOR_PRINTS',
    label: 'Color / Prints',
    colour: 'pink',
    types: ['LAB_DIP', 'PRINT_STRIKEOFF', 'EMBROIDERY_STRIKEOFF'],
    bg: 'bg-pink-50',
    headerBg: 'bg-pink-100',
    text: 'text-pink-700',
  },
  {
    key: 'TRIMS',
    label: 'Trims',
    colour: 'teal',
    types: ['TRIM', 'WASH'],
    bg: 'bg-teal-50',
    headerBg: 'bg-teal-100',
    text: 'text-teal-700',
  },
];

// Status styling
const STATUS_COLOURS = {
  PENDING:                'bg-gray-100 text-gray-600',
  SUBMITTED:              'bg-blue-100 text-blue-700',
  APPROVED:               'bg-green-100 text-green-700',
  REJECTED:               'bg-red-100 text-red-600',
  RESUBMIT:               'bg-yellow-100 text-yellow-700',
  APPROVED_WITH_COMMENTS: 'bg-teal-100 text-teal-700',
};
const STATUS_DOT = {
  PENDING:                'bg-gray-300',
  SUBMITTED:              'bg-blue-400',
  APPROVED:               'bg-green-500',
  REJECTED:               'bg-red-500',
  RESUBMIT:               'bg-yellow-400',
  APPROVED_WITH_COMMENTS: 'bg-teal-400',
};
const APPROVAL_STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMIT', 'APPROVED_WITH_COMMENTS'];

function fmtType(t) { return t.replace(/_/g, ' '); }
function fmtStatus(s) { return s.replace(/_/g, ' '); }
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const y  = dt.getUTCFullYear();
  const m  = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}
function sumQty(sb) {
  if (!sb || typeof sb !== 'object') return 0;
  return Object.values(sb).reduce((s, v) => s + (Number(v) || 0), 0);
}

// Optional info columns shown to the left of the approval grid
const OPTIONAL_COLS = [
  { key: 'customer', label: 'Customer' },
  { key: 'store',    label: 'Store'    },
  { key: 'qty',      label: 'Qty'      },
  { key: 'price',    label: 'Price'    },
  { key: 'shipBy',   label: 'Ship By'  },
];
const COL_STORAGE_KEY = 'wip-approvals-hidden-cols';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WIPApprovalsPage() {
  const [customers,  setCustomers]  = useState([]);
  const [pos,        setPOs]        = useState([]);
  const [lineItems,  setLineItems]  = useState([]);
  const [loading,    setLoading]    = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [poId,       setPoId]       = useState('');

  // Modal state for viewing/editing a single WIPCell
  const [modal, setModal] = useState(null); // { cell, lineItem } | null

  // "Add cell" popover state
  const [addPopover, setAddPopover] = useState(null); // { lineItemId, approvalType, segment }
  const [addLabel,   setAddLabel]   = useState('');
  const [addSaving,  setAddSaving]  = useState(false);

  // Column visibility
  const [hiddenCols,    setHiddenCols]    = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(COL_STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const colPickerRef = useRef(null);

  function toggleCol(key) {
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(COL_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }
  const show = key => !hiddenCols.has(key);

  // ── Initial data ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(d => setCustomers(d.customers || []));
  }, []);

  useEffect(() => {
    if (!customerId) { setPOs([]); setPoId(''); setLineItems([]); return; }
    fetch(`/api/purchase-orders?customerId=${customerId}`)
      .then(r => r.json())
      .then(d => setPOs(d.purchaseOrders || []));
    setPoId('');
    setLineItems([]);
  }, [customerId]);

  // ── Load WIP data ────────────────────────────────────────────────────────
  function loadWIP() {
    if (!customerId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId);
    if (poId)       params.set('poId', poId);
    fetch(`/api/wip/approvals?${params}`)
      .then(r => r.json())
      .then(d => setLineItems(d.lineItems || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (customerId) loadWIP(); }, [customerId, poId]);

  useEffect(() => {
    function handler(e) {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setColPickerOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Add WIPCell ──────────────────────────────────────────────────────────
  async function handleAddCell(lineItemId, approvalType, segment) {
    if (addSaving) return;
    const label = addLabel.trim() || approvalType;
    setAddSaving(true);
    try {
      const res = await fetch('/api/wip-cells', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poLineItemId: lineItemId, segment, approvalType, label }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to add cell');
        return;
      }
    } finally {
      setAddSaving(false);
      setAddPopover(null);
      setAddLabel('');
      loadWIP();
    }
  }

  // ── Helper: find cells for a line × type ────────────────────────────────
  function getCells(lineItem, approvalType) {
    return (lineItem.wipCells || []).filter(c => c.approvalType === approvalType);
  }
  function getCustomCells(lineItem, segment, label) {
    return (lineItem.wipCells || []).filter(
      c => c.approvalType === 'CUSTOM' && c.segment === segment && c.label === label
    );
  }

  // Compute unique CUSTOM cell labels per segment (dynamic columns)
  const customLabelsBySegment = {};
  SEGMENTS.forEach(seg => {
    const labels = new Set();
    lineItems.forEach(li =>
      (li.wipCells || [])
        .filter(c => c.approvalType === 'CUSTOM' && c.segment === seg.key)
        .forEach(c => labels.add(c.label))
    );
    customLabelsBySegment[seg.key] = [...labels].sort();
  });

  // Group lineItems by PO for better readability
  const byPO = lineItems.reduce((acc, li) => {
    const pid = li.po?.id || 'unknown';
    if (!acc[pid]) acc[pid] = { po: li.po, lines: [] };
    acc[pid].lines.push(li);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Approval WIP"
        subtitle="Track approval status across PO lines — Samples, Fabrics, Color/Prints, Trims"
        action={{ href: '/dashboard/packages/new', label: '+ New Package' }}
      />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Customer</label>
          <select className="select-field min-w-[180px]" value={customerId}
            onChange={e => setCustomerId(e.target.value)}>
            <option value="">— Select customer —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {pos.length > 0 && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">PO (optional)</label>
            <select className="select-field min-w-[160px]" value={poId}
              onChange={e => setPoId(e.target.value)}>
              <option value="">All POs</option>
              {pos.map(p => <option key={p.id} value={p.id}>{p.poNo}</option>)}
            </select>
          </div>
        )}
        {/* Column picker */}
        <div className="relative ml-auto" ref={colPickerRef}>
          <button
            onClick={() => setColPickerOpen(o => !o)}
            className="select-field text-sm flex items-center gap-1.5 whitespace-nowrap">
            <span>⊞</span> Columns
            {hiddenCols.size > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5 font-medium">
                {OPTIONAL_COLS.length - hiddenCols.size}/{OPTIONAL_COLS.length}
              </span>
            )}
          </button>
          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-44">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Optional columns</p>
              {OPTIONAL_COLS.map(col => (
                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm hover:text-blue-600">
                  <input type="checkbox"
                    checked={show(col.key)}
                    onChange={() => toggleCol(col.key)}
                    className="accent-blue-600" />
                  {col.label}
                </label>
              ))}
              <hr className="my-2 border-gray-100" />
              <button
                onClick={() => { setHiddenCols(new Set()); localStorage.removeItem(COL_STORAGE_KEY); }}
                className="text-xs text-gray-400 hover:text-gray-600">
                Show all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty / loading states ───────────────────────────────────────── */}
      {!customerId && (
        <div className="card text-center py-16 text-gray-400">
          Select a customer to view their WIP status
        </div>
      )}

      {customerId && loading && (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      )}

      {customerId && !loading && lineItems.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          No PO lines found. Create POs for this customer to track WIP approvals.
        </div>
      )}

      {/* ── WIP Grid ─────────────────────────────────────────────────────── */}
      {!loading && lineItems.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-xs border-collapse">
            {/* Segment header row */}
            <thead>
              <tr>
                {/* ── Mandatory sticky cols ── */}
                <th className="sticky left-0 z-20 bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>PO #</th>
                <th className="sticky left-[80px] z-20 bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Style</th>
                {/* ── Mandatory non-sticky cols ── */}
                <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Color / Print</th>
                <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Cancel Date</th>
                {/* ── Optional cols ── */}
                {show('customer') && <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Customer</th>}
                {show('store')    && <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Store</th>}
                {show('qty')      && <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Qty</th>}
                {show('price')    && <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Price</th>}
                {show('shipBy')   && <th className="bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap" rowSpan={2}>Ship By</th>}
                {/* ── Segment group headers ── */}
                {SEGMENTS.map(seg => {
                  const customCount = customLabelsBySegment[seg.key]?.length || 0;
                  return (
                    <th key={seg.key}
                      colSpan={seg.types.length + customCount}
                      className={`${seg.headerBg} ${seg.text} border-b border-r border-gray-200 px-3 py-1.5 text-center font-semibold tracking-wide uppercase text-xs`}>
                      {seg.label}
                    </th>
                  );
                })}
              </tr>

              {/* Type sub-header row */}
              <tr>
                {SEGMENTS.flatMap(seg => {
                  const customLabels = customLabelsBySegment[seg.key] || [];
                  return [
                    ...seg.types.map((type, idx) => (
                      <th key={type}
                        className={`${seg.bg} border-b border-gray-200 ${idx === seg.types.length - 1 && customLabels.length === 0 ? 'border-r' : ''} px-2 py-1.5 text-center font-medium text-gray-600 whitespace-nowrap`}>
                        {fmtType(type)}
                      </th>
                    )),
                    ...customLabels.map((label, cIdx) => (
                      <th key={`custom_${seg.key}_${label}`}
                        className={`${seg.bg} border-b border-gray-200 ${cIdx === customLabels.length - 1 ? 'border-r' : ''} px-2 py-1.5 text-center font-medium italic text-gray-500 whitespace-nowrap`}>
                        {label}
                      </th>
                    )),
                  ];
                })}
              </tr>
            </thead>

            <tbody>
              {Object.values(byPO).flatMap(({ po, lines }) =>
                lines.map((li, lineIdx) => (
                  <tr key={li.id} className="border-b border-gray-100 hover:bg-gray-50/50 group">
                    {/* PO# — only in first row of PO group */}
                    <td className={`sticky left-0 z-10 bg-white border-r border-gray-100 px-3 py-2 font-medium text-blue-600 whitespace-nowrap ${lineIdx > 0 ? 'opacity-30' : ''}`}>
                      {lineIdx === 0 ? (
                        <Link href={`/dashboard/purchase-orders/${po?.id}`} className="hover:underline">
                          {po?.poNo}
                        </Link>
                      ) : '↑'}
                    </td>

                    {/* Style */}
                    <td className="sticky left-[80px] z-10 bg-white border-r border-gray-100 px-3 py-2 font-medium whitespace-nowrap">
                      {li.style?.styleNo || '—'}
                    </td>

                    {/* Color / Print — mandatory */}
                    <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap">
                      {li.color || '—'}
                    </td>

                    {/* Cancel Date (IH Date) — mandatory */}
                    <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                      {fmtDate(po?.ihDate)}
                    </td>

                    {/* Optional cols */}
                    {show('customer') && (
                      <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {po?.customer?.name || '—'}
                      </td>
                    )}
                    {show('store') && (
                      <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {po?.store || '—'}
                      </td>
                    )}
                    {show('qty') && (
                      <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {sumQty(li.sizeBreakdown) || '—'}
                      </td>
                    )}
                    {show('price') && (
                      <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {li.unitPrice ? `$${Number(li.unitPrice).toFixed(2)}` : '—'}
                      </td>
                    )}
                    {show('shipBy') && (
                      <td className="border-r border-gray-100 px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                        {fmtDate(po?.shipByDate)}
                      </td>
                    )}

                    {/* WIP cell columns — fixed types + custom labels per segment */}
                    {SEGMENTS.flatMap(seg => {
                      const customLabels = customLabelsBySegment[seg.key] || [];
                      const totalCols = seg.types.length + customLabels.length;
                      return [
                        // Fixed type columns
                        ...seg.types.map((type, idx) => {
                          const cells = getCells(li, type);
                          const isLast = idx === totalCols - 1;
                          return (
                            <td key={type}
                              className={`px-1.5 py-1.5 align-top ${seg.bg} bg-opacity-30 ${isLast ? 'border-r border-gray-200' : ''}`}>
                              <div className="flex flex-col gap-1 min-w-[72px]">
                                {cells.map(cell => (
                                  <button key={cell.id}
                                    onClick={() => setModal({ cell, lineItem: li })}
                                    className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate ${STATUS_COLOURS[cell.status] || 'bg-gray-100 text-gray-600'} hover:opacity-80 transition-opacity`}
                                    title={`${cell.label} — ${fmtStatus(cell.status)}\nClick to view history`}>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[cell.status] || 'bg-gray-300'}`}></span>
                                    {cell.label !== type ? cell.label : fmtStatus(cell.status)}
                                  </button>
                                ))}
                                <button
                                  onClick={() => { setAddPopover({ lineItemId: li.id, approvalType: type, segment: seg.key }); setAddLabel(type); }}
                                  className="w-full text-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded text-xs py-0.5 transition-colors opacity-0 group-hover:opacity-100"
                                  title={`Add ${fmtType(type)} cell`}>+</button>
                              </div>
                            </td>
                          );
                        }),
                        // Dynamic CUSTOM label columns
                        ...customLabels.map((label, cIdx) => {
                          const cells = getCustomCells(li, seg.key, label);
                          const isLast = cIdx === customLabels.length - 1;
                          return (
                            <td key={`custom_${seg.key}_${label}`}
                              className={`px-1.5 py-1.5 align-top ${seg.bg} bg-opacity-30 ${isLast ? 'border-r border-gray-200' : ''}`}>
                              <div className="flex flex-col gap-1 min-w-[72px]">
                                {cells.map(cell => (
                                  <button key={cell.id}
                                    onClick={() => setModal({ cell, lineItem: li })}
                                    className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate ${STATUS_COLOURS[cell.status] || 'bg-gray-100 text-gray-600'} hover:opacity-80 transition-opacity`}
                                    title={`${cell.label} — ${fmtStatus(cell.status)}\nClick to view history`}>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${STATUS_DOT[cell.status] || 'bg-gray-300'}`}></span>
                                    {fmtStatus(cell.status)}
                                  </button>
                                ))}
                                <button
                                  onClick={() => { setAddPopover({ lineItemId: li.id, approvalType: 'CUSTOM', segment: seg.key }); setAddLabel(label); }}
                                  className="w-full text-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded text-xs py-0.5 transition-colors opacity-0 group-hover:opacity-100"
                                  title={`Add ${label} cell`}>+</button>
                              </div>
                            </td>
                          );
                        }),
                      ];
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Cell Popover ─────────────────────────────────────────────── */}
      {addPopover && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20"
          onClick={() => { setAddPopover(null); setAddLabel(''); }}>
          <div className="bg-white rounded-xl shadow-xl p-5 w-80 text-sm"
            onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">
              Add {fmtType(addPopover.approvalType)} Cell
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Label (leave blank to use type name):
            </p>
            <input
              className="input-field w-full mb-3"
              value={addLabel}
              placeholder={addPopover.approvalType}
              onChange={e => setAddLabel(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCell(addPopover.lineItemId, addPopover.approvalType, addPopover.segment);
                if (e.key === 'Escape') { setAddPopover(null); setAddLabel(''); }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAddCell(addPopover.lineItemId, addPopover.approvalType, addPopover.segment)}
                disabled={addSaving}
                className="btn-primary text-xs flex-1">
                {addSaving ? 'Adding…' : 'Add Cell'}
              </button>
              <button
                onClick={() => { setAddPopover(null); setAddLabel(''); }}
                className="btn-secondary text-xs flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cell Detail Modal ─────────────────────────────────────────────── */}
      {modal && (
        <CellModal
          cell={modal.cell}
          lineItem={modal.lineItem}
          onClose={() => setModal(null)}
          onCellUpdated={updatedCell => {
            // Patch the single cell in lineItems — no full reload needed
            setLineItems(prev => prev.map(li => ({
              ...li,
              wipCells: (li.wipCells || []).map(c =>
                c.id === updatedCell.id ? updatedCell : c
              ),
            })));
          }}
          onDeleted={() => { setModal(null); loadWIP(); }}
        />
      )}
    </div>
  );
}

// ── Cell detail modal ─────────────────────────────────────────────────────────

function CellModal({ cell, lineItem, onClose, onCellUpdated, onDeleted }) {
  const [status,   setStatus]   = useState(cell.status);
  const [comment,  setComment]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localComments, setLocalComments] = useState(cell.comments || []);

  const po    = lineItem.po;
  const style = lineItem.style;

  async function handleSave() {
    if (!comment.trim() && status === cell.status) { onClose(); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/wip-cells/${cell.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updatedCell = await res.json();
        // Patch the grid cell in place — no reload
        onCellUpdated?.(updatedCell);
      }
      if (comment.trim()) {
        await fetch(`/api/wip-cells/${cell.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: comment, approvalStatus: status }),
        }).catch(() => {});
        setLocalComments(prev => [...prev, {
          id: `_${Date.now()}`,
          text: comment,
          approvalStatus: status,
          createdAt: new Date().toISOString(),
          createdBy: { name: 'You' },
        }]);
        setComment('');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this WIP cell? This will remove all comment history.')) return;
    setDeleting(true);
    try {
      await fetch(`/api/wip-cells/${cell.id}`, { method: 'DELETE' });
      onDeleted?.();
    } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{fmtType(cell.approvalType)}</span>
              {cell.label !== cell.approvalType && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{cell.label}</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {po?.poNo} · {style?.styleNo} · {lineItem.color || '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Status selector */}
          <div>
            <label className="label-field">Status</label>
            <select className="select-field w-full" value={status}
              onChange={e => setStatus(e.target.value)}>
              {APPROVAL_STATUSES.map(s => (
                <option key={s} value={s}>{fmtStatus(s)}</option>
              ))}
            </select>
          </div>

          {/* Comment history */}
          {localComments.length > 0 && (
            <div>
              <p className="label-field mb-2">Comment History</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {localComments.map((c, i) => (
                  <div key={c.id || i} className="text-xs bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[c.approvalStatus] || 'bg-gray-300'}`}></span>
                      <span className="font-medium text-gray-600">{fmtStatus(c.approvalStatus || cell.status)}</span>
                      <span className="text-gray-400 ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                      {c.createdBy?.name && <span className="text-gray-400">· {c.createdBy.name}</span>}
                    </div>
                    <p className="text-gray-700 leading-snug">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add comment */}
          <div>
            <label className="label-field">Add Comment</label>
            <textarea
              className="input-field w-full"
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Enter comment…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between gap-2">
          <button onClick={handleDelete} disabled={deleting}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
            {deleting ? 'Deleting…' : 'Delete cell'}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
