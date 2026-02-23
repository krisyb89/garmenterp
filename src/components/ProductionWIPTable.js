// src/components/ProductionWIPTable.js
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

// ── Status → background color mapping ──
function cellBg(status) {
  if (!status) return '';
  switch (status) {
    case 'SUBMITTED':
    case 'PENDING':
      return 'bg-yellow-200';
    case 'APPROVED':
    case 'APPROVED_WITH_COMMENTS':
      return 'bg-green-300';
    case 'REJECTED':
      return 'bg-red-300';
    case 'RESUBMIT':
      return 'bg-orange-200';
    // Sample statuses
    case 'IN_PROGRESS':
      return 'bg-yellow-200';
    default:
      return 'bg-gray-100';
  }
}

function sampleCellBg(status) {
  if (!status) return '';
  switch (status) {
    case 'PENDING':
    case 'IN_PROGRESS':
      return 'bg-yellow-200';
    case 'SUBMITTED':
      return 'bg-blue-200';
    case 'APPROVED':
    case 'APPROVED_WITH_COMMENTS':
      return 'bg-green-300';
    case 'REJECTED':
      return 'bg-red-300';
    default:
      return 'bg-gray-100';
  }
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function fmtDateFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

// ── Approval Cell Component ──
function ApprovalCell({ approval, styleId, poLineItemId, approvalType, slot, materialLabel, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomOptions, setBomOptions] = useState([]); // {id,name,code,category,placement}
  const [materialId, setMaterialId] = useState('');
  const ref = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const status = approval?.status;
  const bg = cellBg(status);
  const dateStr = approval?.submitDate ? fmtDate(approval.submitDate) : '';
  const approvedStr = approval?.approvalDate ? fmtDate(approval.approvalDate) : '';

  const needsMaterial = approvalType === 'FABRIC' || approvalType === 'TRIM';

  // Load BOM options when opening for Fabric/Trim columns.
  useEffect(() => {
    if (!open || !needsMaterial || !styleId) return;
    let cancelled = false;
    async function loadBom() {
      setBomLoading(true);
      try {
        const res = await fetch(`/api/styles/${styleId}/bom`);
        const data = await res.json();
        const items = Array.isArray(data?.bomItems) ? data.bomItems : [];

        // Filter by material category name (defaults: FABRIC/TRIM). Fall back to all if unknown.
        const desired = approvalType;
        const filtered = items.filter((bi) => {
          const cat = (bi?.material?.category?.name || '').toUpperCase();
          if (!cat) return true;
          if (desired === 'FABRIC') return cat.includes('FAB');
          if (desired === 'TRIM') return cat.includes('TRIM');
          return true;
        });

        const opts = filtered.map((bi) => ({
          id: bi.materialId,
          code: bi.material?.code,
          name: bi.material?.name,
          category: bi.material?.category?.name,
          placement: bi.placement || bi.description || '',
        }));

        if (cancelled) return;
        setBomOptions(opts);

        // Default selection: existing approval materialId, otherwise first option.
        const current = approval?.materialId || '';
        setMaterialId(current || (opts[0]?.id || ''));
      } finally {
        if (!cancelled) setBomLoading(false);
      }
    }
    loadBom();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, needsMaterial, styleId, approvalType]);

  async function quickAction(action) {
    setSaving(true);
    try {
      if (!approval) {
        if (needsMaterial && !materialId) {
          // Do not create a Fabric/Trim approval without linking a material.
          setSaving(false);
          return;
        }
        // Concurrency check: verify no approval was just created by another user
        const checkParams = new URLSearchParams({
          poLineItemId,
          type: approvalType,
          ...(slot && { slot }),
        });
        const checkRes = await fetch(`/api/approvals?${checkParams}`);
        const checkData = await checkRes.json();
        if (checkData.approvals?.length > 0) {
          // Someone just created an approval for this cell, refresh instead
          onRefresh();
          setSaving(false);
          setOpen(false);
          return;
        }
        // Create new approval record: status = SUBMITTED
        await fetch('/api/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            styleId,
            poLineItemId,
            type: approvalType,
            slot,
            materialId: needsMaterial ? materialId : null,
            status: 'SUBMITTED',
            submitDate: new Date().toISOString(),
          }),
        });
      } else {
        // Update existing
        const data = { status: action };
        if (action === 'APPROVED' || action === 'APPROVED_WITH_COMMENTS') {
          data.approvalDate = new Date().toISOString();
        }
        await fetch(`/api/approvals/${approval.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
      onRefresh();
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <td
      className={`wip-cell relative cursor-pointer select-none ${bg}`}
      onClick={() => setOpen(true)}
      title={approval ? `${approvalType.replace(/_/g, ' ')} — ${status}\nSubmit #${approval.submissionNo}${approval.material?.name ? `\nMaterial: ${approval.material.name}` : ''}${approval.reference ? `\nRef: ${approval.reference}` : ''}${approval.supplierName ? `\nSupplier: ${approval.supplierName}` : ''}` : 'Click to submit'}
    >
      <div className="text-center text-[11px] leading-tight whitespace-nowrap">
        {dateStr && <div>{dateStr}</div>}
        {approvedStr && status === 'APPROVED' && <div className="text-[10px] text-green-800">{approvedStr}</div>}
        {!dateStr && <div className="text-gray-300">—</div>}
      </div>

      {/* Popover */}
      {open && (
        <div
          ref={ref}
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl p-3 min-w-[180px]"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-xs font-semibold text-gray-700 mb-2">
            {approvalType.replace(/_/g, ' ')}
            {materialLabel && <span className="text-gray-400 ml-1">({materialLabel})</span>}
          </div>

          {needsMaterial && !approval && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-500 mb-1">Link to BOM material</div>
              <select
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                disabled={bomLoading}
              >
                {bomLoading && <option value="">Loading…</option>}
                {!bomLoading && bomOptions.length === 0 && <option value="">No BOM items</option>}
                {!bomLoading && bomOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.code ? `${opt.code} — ` : ''}{opt.name}{opt.placement ? ` (${opt.placement})` : ''}
                  </option>
                ))}
              </select>
              {needsMaterial && !materialId && (
                <div className="text-[10px] text-red-500 mt-1">Select a material to submit.</div>
              )}
            </div>
          )}

          {!approval ? (
            <button
              onClick={() => quickAction('SUBMITTED')}
              disabled={saving || (needsMaterial && !materialId)}
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-yellow-50 text-yellow-700 font-medium"
            >
              {saving ? 'Saving...' : 'Submit for Review'}
            </button>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 mb-1">
                Status: {status} &bull; Submit #{approval.submissionNo}
                {approval.reference && <div>Ref: {approval.reference}</div>}
              </div>

              {(status === 'SUBMITTED' || status === 'PENDING') && (
                <>
                  <button
                    onClick={() => quickAction('APPROVED')}
                    disabled={saving}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-green-50 text-green-700 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => quickAction('APPROVED_WITH_COMMENTS')}
                    disabled={saving}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-green-50 text-green-600 font-medium"
                  >
                    Approve with Comments
                  </button>
                  <button
                    onClick={() => quickAction('REJECTED')}
                    disabled={saving}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-red-50 text-red-700 font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => quickAction('RESUBMIT')}
                    disabled={saving}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-orange-50 text-orange-700 font-medium"
                  >
                    Request Resubmit
                  </button>
                </>
              )}

              {(status === 'REJECTED' || status === 'RESUBMIT') && (
                <button
                  onClick={() => quickAction('SUBMITTED')}
                  disabled={saving}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-yellow-50 text-yellow-700 font-medium"
                >
                  Re-submit
                </button>
              )}

              {(status === 'APPROVED' || status === 'APPROVED_WITH_COMMENTS') && (
                <div className="text-[10px] text-green-600 px-2 py-1">
                  Approved {approvedStr}
                </div>
              )}

              <Link
                href={`/dashboard/approvals/${approval.id}`}
                className="block text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 text-blue-600"
              >
                Open Full Details &rarr;
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen(false)}
            className="absolute top-1 right-2 text-gray-300 hover:text-gray-500 text-sm"
          >
            &times;
          </button>
        </div>
      )}
    </td>
  );
}

// ── Sample Cell Component ──
function SampleCell({ sample, styleId, stage }) {
  const status = sample?.status;
  const bg = sampleCellBg(status);
  const dateStr = sample?.dateSent ? fmtDate(sample.dateSent) : '';

  return (
    <td
      className={`wip-cell ${bg}`}
      title={sample ? `${stage} Sample — ${status}\nRevision #${sample.revisionNo}` : `No ${stage} sample`}
    >
      <div className="text-center text-[11px] leading-tight whitespace-nowrap">
        {dateStr ? <div>{dateStr}</div> : <div className="text-gray-300">—</div>}
      </div>
    </td>
  );
}

// ── Main Production WIP Table ──
export default function ProductionWIPTable({ rows, columns = [], onRefresh }) {
  const [statusFilter, setStatusFilter] = useState('');

  const filteredRows = statusFilter
    ? rows.filter(r => r.poStatus === statusFilter)
    : rows;

  // Production WIP milestone columns are stored in DB (scope=PRODUCTION).
  // We only make the milestone columns configurable (Samples/Approvals).
  const activeCols = (Array.isArray(columns) ? columns : []).filter(c => c && c.isActive);
  const sampleCols = activeCols.filter(c => (c.kind || '').toUpperCase() === 'SAMPLE').sort((a,b) => (a.sortOrder||0)-(b.sortOrder||0));
  const approvalCols = activeCols.filter(c => (c.kind || '').toUpperCase() === 'APPROVAL').sort((a,b) => (a.sortOrder||0)-(b.sortOrder||0));

  const sampleColsFinal = sampleCols.length ? sampleCols : [
    { id: 'fallback-fit', key: 'SAMPLE_FIT', label: 'Fits', kind: 'SAMPLE', sampleStage: 'FIT' },
    { id: 'fallback-pp', key: 'SAMPLE_PP', label: 'PP', kind: 'SAMPLE', sampleStage: 'PP' },
    { id: 'fallback-top', key: 'SAMPLE_TOP', label: 'TOP', kind: 'SAMPLE', sampleStage: 'TOP' },
    { id: 'fallback-ship', key: 'SAMPLE_SHIPMENT', label: 'Shipment', kind: 'SAMPLE', sampleStage: 'SHIPMENT' },
  ];
  const approvalColsFinal = approvalCols.length ? approvalCols : [
    { id: 'fallback-lab', key: 'APP_LAB_DIP', label: 'Lab Dip', kind: 'APPROVAL', approvalType: 'LAB_DIP', approvalSlot: null },
    { id: 'fallback-fs', key: 'APP_FABRIC_SELF', label: 'Self Fabric', kind: 'APPROVAL', approvalType: 'FABRIC', approvalSlot: 'SELF' },
    { id: 'fallback-fc', key: 'APP_FABRIC_CONTRAST', label: 'Contrast', kind: 'APPROVAL', approvalType: 'FABRIC', approvalSlot: 'CONTRAST' },
    { id: 'fallback-t1', key: 'APP_TRIM_1', label: 'Trim 1', kind: 'APPROVAL', approvalType: 'TRIM', approvalSlot: 'TRIM_1' },
    { id: 'fallback-t2', key: 'APP_TRIM_2', label: 'Trim 2', kind: 'APPROVAL', approvalType: 'TRIM', approvalSlot: 'TRIM_2' },
    { id: 'fallback-ps', key: 'APP_PRINT_STRIKEOFF', label: 'S/O Print', kind: 'APPROVAL', approvalType: 'PRINT_STRIKEOFF', approvalSlot: null },
    { id: 'fallback-es', key: 'APP_EMB_STRIKEOFF', label: 'S/O Emb', kind: 'APPROVAL', approvalType: 'EMBROIDERY_STRIKEOFF', approvalSlot: null },
    { id: 'fallback-wash', key: 'APP_WASH', label: 'Wash', kind: 'APPROVAL', approvalType: 'WASH', approvalSlot: null },
  ];

  const statuses = ['', 'RECEIVED', 'CONFIRMED', 'IN_PRODUCTION', 'PARTIALLY_SHIPPED', 'FULLY_SHIPPED', 'CLOSED'];

  return (
    <div>
      {/* Status filter */}
      <div className="flex gap-1 mb-3 flex-wrap items-center">
        <span className="text-xs text-gray-500 mr-1">PO Status:</span>
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2 py-1 rounded text-xs font-medium ${
              statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s ? s.replace(/_/g, ' ') : 'All'}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filteredRows.length} rows</span>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3 text-[11px] items-center flex-wrap">
        <span className="text-gray-500">Legend:</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 h-3 rounded bg-yellow-200 inline-block"></span> Submitted</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 h-3 rounded bg-green-300 inline-block"></span> Approved</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 h-3 rounded bg-red-300 inline-block"></span> Rejected</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 h-3 rounded bg-orange-200 inline-block"></span> Resubmit</span>
        <span className="inline-flex items-center gap-1"><span className="w-4 h-3 rounded bg-blue-200 inline-block"></span> Sample Sent</span>
      </div>

      {/* The WIP spreadsheet */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px] leading-tight border-collapse">
            <thead>
              {/* Group header row */}
              <tr className="bg-gray-100 border-b border-gray-300">
                <th colSpan={3} className="wip-hdr border-r border-gray-300">Order Info</th>
                <th colSpan={4} className="wip-hdr border-r border-gray-300">Style &amp; Quantity</th>
                <th colSpan={2} className="wip-hdr border-r border-gray-300">Dates</th>
                <th colSpan={1} className="wip-hdr border-r border-gray-300">Production</th>
                <th colSpan={sampleColsFinal.length} className="wip-hdr border-r border-gray-300">Samples</th>
                <th colSpan={approvalColsFinal.length} className="wip-hdr">Approvals &amp; Submits</th>
              </tr>
              {/* Column header row */}
              <tr className="bg-gray-50 border-b border-gray-200">
                {/* Order info */}
                <th className="wip-col border-r">PO #</th>
                <th className="wip-col">Customer</th>
                <th className="wip-col border-r">Store</th>
                {/* Style */}
                <th className="wip-col">Style #</th>
                <th className="wip-col">Color</th>
                <th className="wip-col">Qty</th>
                <th className="wip-col border-r">Price</th>
                {/* Dates */}
                <th className="wip-col">Ship By</th>
                <th className="wip-col border-r">IH Date</th>
                {/* Production */}
                <th className="wip-col border-r">Factory</th>
                {/* Samples */}
                {sampleColsFinal.map(sc => (
                  <th key={sc.id || sc.key} className="wip-col-sm">{sc.label}</th>
                ))}
                <th className="border-r border-gray-200 w-0"></th>
                {/* Approvals */}
                {approvalColsFinal.map(ac => (
                  <th key={ac.id || ac.key} className="wip-col-sm">{ac.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10 + sampleColsFinal.length + 1 + approvalColsFinal.length} className="text-center py-8 text-gray-400">
                    No PO line items found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    {/* Order info */}
                    <td className="wip-cell border-r font-medium">
                      <Link href={`/dashboard/purchase-orders/${row.poId}`} className="text-blue-600 hover:underline">
                        {row.poNo}
                      </Link>
                    </td>
                    <td className="wip-cell text-gray-700">{row.customerCode || row.customerName}</td>
                    <td className="wip-cell border-r text-gray-500">{row.store || '—'}</td>
                    {/* Style */}
                    <td className="wip-cell font-medium">
                      <Link href={`/dashboard/styles/${row.styleId}`} className="text-blue-600 hover:underline">
                        {row.styleNo}
                      </Link>
                    </td>
                    <td className="wip-cell">{row.color}</td>
                    <td className="wip-cell text-right">{(row.totalQty || 0).toLocaleString()}</td>
                    <td className="wip-cell text-right border-r">{row.currency} {Number(row.unitPrice || 0).toFixed(2)}</td>
                    {/* Dates */}
                    <td className="wip-cell text-center">{fmtDateFull(row.shipByDate)}</td>
                    <td className="wip-cell text-center border-r">{fmtDateFull(row.ihDate)}</td>
                    {/* Production */}
                    <td className="wip-cell border-r text-gray-600">{row.factory || '—'}</td>
                    {/* Samples */}
                    {sampleColsFinal.map(sc => (
                      <SampleCell
                        key={sc.id || sc.key}
                        sample={row.sampleIndex?.[sc.sampleStage] || row.samples?.[sc.sampleStage]}
                        styleId={row.styleId}
                        stage={sc.sampleStage}
                      />
                    ))}
                    <td className="border-r border-gray-200 w-0 p-0"></td>
                    {/* Approvals */}
                    {approvalColsFinal.map(ac => {
                      const t = ac.approvalType;
                      const s = ac.approvalSlot || null;
                      const idxKey = `${t}:${s || ''}`;
                      const approval = row.approvalIndex?.[idxKey] || null;
                      return (
                        <ApprovalCell
                          key={ac.id || ac.key}
                          approval={approval}
                          styleId={row.styleId}
                          poLineItemId={row.id}
                          approvalType={t}
                          slot={s}
                          materialLabel={ac.label}
                          onRefresh={onRefresh}
                        />
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
