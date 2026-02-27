// src/app/(dashboard)/dashboard/packages/[id]/page.js
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────
const COURIERS = ['UPS', 'FEDEX', 'DHL', 'HAND_CARRY', 'OTHER'];

const APPROVAL_TYPES = {
  SAMPLES:      ['PP', 'TOP', 'FIT', 'PROTO', 'GPT', 'SHIPMENT_SAMPLE'],
  FABRICS:      ['FABRIC'],
  COLOR_PRINTS: ['LAB_DIP', 'PRINT_STRIKEOFF', 'EMBROIDERY_STRIKEOFF'],
  TRIMS:        ['TRIM', 'WASH'],
};
const ALL_APPROVAL_TYPES = [...Object.values(APPROVAL_TYPES).flat(), 'CUSTOM'];
const WIP_SEGMENTS = ['SAMPLES', 'FABRICS', 'COLOR_PRINTS', 'TRIMS'];

const SEGMENT_FOR_TYPE = (type) => {
  for (const [seg, types] of Object.entries(APPROVAL_TYPES)) {
    if (types.includes(type)) return seg;
  }
  return 'SAMPLES'; // default for CUSTOM
};

// Carrier tracking URLs
function trackingUrl(courier, trackingNo) {
  if (!trackingNo) return null;
  switch (courier) {
    case 'UPS':   return `https://www.ups.com/track?tracknum=${trackingNo}`;
    case 'FEDEX': return `https://www.fedex.com/fedextrack/?trknbr=${trackingNo}`;
    case 'DHL':   return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNo}`;
    default:      return null;
  }
}

const APPROVAL_STATUSES = ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMIT', 'APPROVED_WITH_COMMENTS'];

const STATUS_COLOURS = {
  PENDING:                 'bg-gray-100 text-gray-600',
  SUBMITTED:               'bg-blue-100 text-blue-700',
  APPROVED:                'bg-green-100 text-green-700',
  REJECTED:                'bg-red-100 text-red-600',
  RESUBMIT:                'bg-yellow-100 text-yellow-700',
  APPROVED_WITH_COMMENTS:  'bg-teal-100 text-teal-700',
};

const PKG_STATUS_COLOURS = {
  DRAFT:    'bg-gray-100 text-gray-600',
  SENT:     'bg-blue-100 text-blue-700',
  RECEIVED: 'bg-green-100 text-green-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
};

const DEFAULT_APPROVAL_HEADERS = ['Type', 'PO', 'Style', 'Color / Print', 'Label', 'Outcome', 'Comments'];
const HEADER_STORAGE_KEY = 'approval-col-headers';

function fmt(d) { return d ? new Date(d).toISOString().split('T')[0] : ''; }

// ── Blank row helpers ─────────────────────────────────────────────────────────
const blankApproval = () => ({
  _id: `_${Date.now()}`, section: 'APPROVAL',
  approvalType: 'PP', customSegment: 'SAMPLES',
  poId: '', poLineItemId: '', colorPrint: '', label: '',
  approvalStatus: 'PENDING', comments: '',
});
const blankSRS = () => ({
  _id: `_${Date.now()}`, section: 'SRS',
  srsId: '', colorPrint: '',
  approvalStatus: 'PENDING', comments: '',
});
const blankMisc = () => ({
  _id: `_${Date.now()}`, section: 'MISC', description: '',
});

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PackageDetailPage() {
  const { id } = useParams();

  const [pkg,      setPkg]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState('');
  const [trackChecking, setTrackChecking] = useState(false);
  const [trackMsg,      setTrackMsg]      = useState(null); // { text, type: 'info'|'success'|'error' }

  // Header form
  const [hdr, setHdr] = useState({
    courier: '', trackingNo: '', dateSent: '', notes: '',
  });

  // Data for selectors
  const [pos,     setPOs]     = useState([]);
  const [allSRS,  setAllSRS]  = useState([]);

  // POLines by poId (lazy loaded)
  const [poLinesCache, setPoLinesCache] = useState({});

  // Pending new rows (not yet saved)
  const [newApprovals, setNewApprovals] = useState([]);
  const [newSRSItems,  setNewSRSItems]  = useState([]);
  const [newMiscItems, setNewMiscItems] = useState([]);

  // Editable column headers (persisted in localStorage)
  const [colHeaders, setColHeaders] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HEADER_STORAGE_KEY) || 'null') || DEFAULT_APPROVAL_HEADERS; }
    catch { return [...DEFAULT_APPROVAL_HEADERS]; }
  });
  function updateHeader(idx, val) {
    setColHeaders(prev => {
      const next = [...prev];
      next[idx] = val || DEFAULT_APPROVAL_HEADERS[idx];
      localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  // ── Fetch package ────────────────────────────────────────────────────────
  const loadPkg = useCallback(() => {
    fetch(`/api/packages/${id}`)
      .then(r => r.json())
      .then(data => {
        setPkg(data);
        setHdr({
          courier:    data.courier    || '',
          trackingNo: data.trackingNo || '',
          dateSent:   fmt(data.dateSent),
          notes:      data.notes      || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadPkg(); }, [loadPkg]);

  // Load POs and SRS for this customer
  useEffect(() => {
    if (!pkg?.customer?.id) return;
    fetch(`/api/purchase-orders?customerId=${pkg.customer.id}&limit=200`)
      .then(r => r.json())
      .then(d => setPOs(d.purchaseOrders || d.pos || []));
    fetch(`/api/srs?customerId=${pkg.customer.id}`)
      .then(r => r.json())
      .then(d => setAllSRS(d.srsList || []));
  }, [pkg?.customer?.id]);

  // Load POLines for a given PO (cached).
  // Uses ?lineItemsOnly=true so the server runs a single tiny query instead of
  // the full 4-query parallel fetch used by the PO detail page.
  async function loadPOLines(poId) {
    if (!poId || poLinesCache[poId]) return;
    const res  = await fetch(`/api/purchase-orders/${poId}?lineItemsOnly=true`);
    const data = await res.json();
    setPoLinesCache(prev => ({ ...prev, [poId]: data.lineItems || [] }));
  }

  // ── Save header only (used by autoSave on blur) ───────────────────────────
  async function saveHeader(silent = false) {
    setSaving(true);
    try {
      await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hdr),
      });
      if (!silent) { setSaveMsg('Saved'); setTimeout(() => setSaveMsg(''), 2000); }
    } finally { setSaving(false); }
  }

  // Auto-save on blur — called when any header field loses focus
  function autoSave() { saveHeader(true); }

  // ── Save all: header + every pending item row ─────────────────────────────
  async function saveAll() {
    setSaving(true);
    try {
      const fetches = [
        // 1. Header
        fetch(`/api/packages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hdr),
        }),
      ];

      // 2. Pending approval rows
      for (const row of newApprovals) {
        if (!row.approvalType || !row.poLineItemId) continue;
        const label   = row.label || row.approvalType;
        const segment = row.approvalType === 'CUSTOM'
          ? (row.customSegment || 'SAMPLES')
          : SEGMENT_FOR_TYPE(row.approvalType);
        if (row.approvalType === 'CUSTOM' && !label?.trim()) continue;
        fetches.push(
          fetch(`/api/packages/${id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              section: 'APPROVAL',
              approvalType: row.approvalType,
              colorPrint: row.colorPrint || null,
              wipCellSpecs: [{ poLineItemId: row.poLineItemId, approvalType: row.approvalType, label, segment }],
            }),
          })
        );
      }

      // 3. Pending SRS rows
      for (const row of newSRSItems) {
        if (!row.srsId) continue;
        fetches.push(
          fetch(`/api/packages/${id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: 'SRS', srsId: row.srsId, colorPrint: row.colorPrint || null }),
          })
        );
      }

      // 4. Pending misc rows
      for (const row of newMiscItems) {
        if (!row.description?.trim()) continue;
        fetches.push(
          fetch(`/api/packages/${id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section: 'MISC', description: row.description }),
          })
        );
      }

      await Promise.all(fetches);

      // Clear all pending rows and reload once
      setNewApprovals([]);
      setNewSRSItems([]);
      setNewMiscItems([]);
      loadPkg();

      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setSaving(false);
    }
  }

  // ── Status transitions ────────────────────────────────────────────────────
  async function setStatus(status) {
    setSaving(true);
    try {
      // Persist current header fields first so tracking# etc. aren't lost on reload
      await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...hdr, status }),
      });
      loadPkg();
    } finally { setSaving(false); }
  }

  // ── Carrier tracking check ───────────────────────────────────────────────
  async function checkTracking() {
    setTrackChecking(true);
    setTrackMsg(null);
    try {
      const res  = await fetch(`/api/packages/${id}/track`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'OK') {
        const tagMap = {
          Delivered:       'Package delivered! ✓',
          InTransit:       'In transit',
          OutForDelivery:  'Out for delivery',
          AttemptFail:     'Delivery attempted',
          Pending:         'Tracking pending',
          InfoReceived:    'Info received',
          Exception:       'Delivery exception',
        };
        const tagLabel  = tagMap[data.tag] || data.tag || 'Status unknown';
        const locPart   = data.lastLocation ? ` · ${data.lastLocation}` : '';
        const msgPart   = data.lastMessage  ? `: ${data.lastMessage}`   : '';
        if (data.autoUpdated) {
          setTrackMsg({ text: `Delivered — package marked Received automatically`, type: 'success' });
          loadPkg();
        } else {
          setTrackMsg({ text: `${tagLabel}${msgPart}${locPart}`, type: 'info' });
        }
      } else if (data.status === 'NO_API_KEY') {
        setTrackMsg({ text: 'Auto-tracking needs AFTERSHIP_API_KEY in .env. Use "Track →" link to check manually.', type: 'warn' });
      } else {
        setTrackMsg({ text: data.message || 'Could not fetch tracking status.', type: 'error' });
      }
    } catch {
      setTrackMsg({ text: 'Network error checking tracking.', type: 'error' });
    } finally {
      setTrackChecking(false);
    }
  }

  // ── Save a new item row ───────────────────────────────────────────────────
  // Uses the item returned by the POST to update pkg.items directly, so the
  // new row appears instantly with no full-reload round-trip.
  async function saveApprovalRow(row) {
    if (!row.approvalType || !row.poLineItemId) return;
    const label   = row.label || row.approvalType;
    const segment = row.approvalType === 'CUSTOM'
      ? (row.customSegment || 'SAMPLES')
      : SEGMENT_FOR_TYPE(row.approvalType);
    const res = await fetch(`/api/packages/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section:      'APPROVAL',
        approvalType: row.approvalType,
        colorPrint:   row.colorPrint || null,
        wipCellSpecs: [{
          poLineItemId: row.poLineItemId,
          approvalType: row.approvalType,
          label,
          segment,
        }],
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      // Atomically swap pending row → real saved item, no loadPkg needed
      setNewApprovals(prev => prev.filter(r => r._id !== row._id));
      setPkg(prev => ({ ...prev, items: [...prev.items, saved] }));
    }
  }

  async function saveSRSRow(row) {
    if (!row.srsId) return;
    const res = await fetch(`/api/packages/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section:    'SRS',
        srsId:      row.srsId,
        colorPrint: row.colorPrint || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      setNewSRSItems(prev => prev.filter(r => r._id !== row._id));
      setPkg(prev => ({ ...prev, items: [...prev.items, saved] }));
    }
  }

  async function saveMiscRow(row) {
    if (!row.description?.trim()) return;
    const res = await fetch(`/api/packages/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'MISC', description: row.description }),
    });
    if (res.ok) {
      const saved = await res.json();
      setNewMiscItems(prev => prev.filter(r => r._id !== row._id));
      setPkg(prev => ({ ...prev, items: [...prev.items, saved] }));
    }
  }

  // ── Update existing item outcome / comments ───────────────────────────────
  // Uses the item returned by PUT to patch pkg.items in place — no full reload.
  // Also picks up packageStatus if the server auto-completed the package.
  async function updateItem(itemId, patch) {
    const res = await fetch(`/api/packages/${id}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { item, packageStatus } = await res.json();
      setPkg(prev => ({
        ...prev,
        ...(packageStatus ? { status: packageStatus } : {}),
        items: prev.items.map(i => i.id === itemId ? item : i),
      }));
    }
  }

  async function deleteItem(itemId) {
    await fetch(`/api/packages/${id}/items/${itemId}`, { method: 'DELETE' });
    setPkg(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const canEditOutcome = pkg && pkg.status !== 'DRAFT';

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>;
  if (!pkg)    return <div className="text-center py-20 text-red-500">Package not found</div>;

  const approvalItems = pkg.items.filter(i => i.section === 'APPROVAL');
  const srsItems      = pkg.items.filter(i => i.section === 'SRS');
  const miscItems     = pkg.items.filter(i => i.section === 'MISC');

  return (
    <div>
      <Link href="/dashboard/packages" className="text-sm text-blue-600 mb-2 inline-block">← Packages</Link>

      {/* ── Package header ─────────────────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{pkg.customer?.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Created by {pkg.createdBy?.name} · {new Date(pkg.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PKG_STATUS_COLOURS[pkg.status]}`}>
              {pkg.status}
            </span>
            {pkg.status === 'DRAFT'    && <button onClick={() => setStatus('SENT')}     disabled={saving} className="btn-primary text-xs">Mark Sent</button>}
            {pkg.status === 'SENT'     && <button onClick={() => setStatus('RECEIVED')} disabled={saving} className="btn-primary text-xs">Mark Received</button>}
            {(pkg.status === 'SENT' || pkg.status === 'RECEIVED') && (
              <button onClick={() => setStatus('COMPLETE')} disabled={saving}
                className="text-xs px-3 py-1.5 rounded border border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-medium disabled:opacity-40">
                Mark Complete
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Courier</label>
            <select className="select-field w-full text-sm" value={hdr.courier}
              onChange={e => setHdr(p => ({ ...p, courier: e.target.value }))}
              onBlur={autoSave}>
              <option value="">— Select —</option>
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tracking #</label>
            <div className="flex items-center gap-1">
              <input className="input-field flex-1 text-sm" value={hdr.trackingNo}
                placeholder="e.g. 1Z999AA10123456784"
                onChange={e => setHdr(p => ({ ...p, trackingNo: e.target.value }))}
                onBlur={autoSave} />
              {(() => {
                const url = trackingUrl(hdr.courier, hdr.trackingNo);
                return url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-1"
                    title="Open carrier tracking page">
                    Track →
                  </a>
                ) : null;
              })()}
              {pkg.status === 'SENT' && hdr.trackingNo && (
                <button onClick={checkTracking} disabled={trackChecking}
                  className="text-xs text-green-700 hover:text-green-900 font-medium whitespace-nowrap px-1 disabled:opacity-50"
                  title="Check delivery status via carrier API">
                  {trackChecking ? 'Checking…' : 'Check Delivery'}
                </button>
              )}
            </div>
            {trackMsg && (
              <p className={`text-xs mt-1 ${
                trackMsg.type === 'success' ? 'text-green-600' :
                trackMsg.type === 'error'   ? 'text-red-500'   :
                trackMsg.type === 'warn'    ? 'text-yellow-600' :
                'text-gray-500'
              }`}>
                {trackMsg.text}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date Sent</label>
            <input type="date" className="input-field w-full text-sm" value={hdr.dateSent}
              onChange={e => setHdr(p => ({ ...p, dateSent: e.target.value }))}
              onBlur={autoSave} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input className="input-field w-full text-sm" value={hdr.notes}
            onChange={e => setHdr(p => ({ ...p, notes: e.target.value }))}
            onBlur={autoSave} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={saveAll} disabled={saving} className="btn-primary text-xs">
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saveMsg && <span className="text-green-600 text-xs font-medium">✓ {saveMsg}</span>}
        </div>
      </div>

      {/* ── Section 1: Approvals ────────────────────────────────────────────── */}
      <SectionCard
        title="Approvals"
        subtitle="Linked to PO lines — outcomes update WIP"
        colour="purple"
        onAdd={() => setNewApprovals(prev => [...prev, blankApproval()])}>
        {(approvalItems.length > 0 || newApprovals.length > 0) && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                  <th className="text-left px-3 py-2 w-32"><EditableHeader label={colHeaders[0]} onSave={v => updateHeader(0, v)} /></th>
                  <th className="text-left px-3 py-2"><EditableHeader label={colHeaders[1]} onSave={v => updateHeader(1, v)} /></th>
                  <th className="text-left px-3 py-2"><EditableHeader label={colHeaders[2]} onSave={v => updateHeader(2, v)} /></th>
                  <th className="text-left px-3 py-2"><EditableHeader label={colHeaders[3]} onSave={v => updateHeader(3, v)} /></th>
                  <th className="text-left px-3 py-2 w-32"><EditableHeader label={colHeaders[4]} onSave={v => updateHeader(4, v)} /></th>
                  <th className="text-left px-3 py-2 w-40"><EditableHeader label={colHeaders[5]} onSave={v => updateHeader(5, v)} /></th>
                  <th className="text-left px-3 py-2"><EditableHeader label={colHeaders[6]} onSave={v => updateHeader(6, v)} /></th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {/* Existing items */}
                {approvalItems.map(item => (
                  <ApprovalItemRow key={item.id} item={item}
                    canEdit={canEditOutcome}
                    onUpdate={patch => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)} />
                ))}
                {/* New pending rows */}
                {newApprovals.map(row => (
                  <NewApprovalRow key={row._id} row={row}
                    pos={pos}
                    poLinesCache={poLinesCache}
                    onLoadPOLines={loadPOLines}
                    onChange={patch => setNewApprovals(prev => prev.map(r => r._id === row._id ? { ...r, ...patch } : r))}
                    onSave={() => saveApprovalRow(row)}
                    onCancel={() => setNewApprovals(prev => prev.filter(r => r._id !== row._id))} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {approvalItems.length === 0 && newApprovals.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No approval items yet</p>
        )}
      </SectionCard>

      {/* ── Section 2: SRS ──────────────────────────────────────────────────── */}
      <SectionCard
        title="SRS Requests"
        subtitle="Sending samples for SRS — marks SRS as Sample Sent on dispatch"
        colour="indigo"
        onAdd={() => setNewSRSItems(prev => [...prev, blankSRS()])}>
        {(srsItems.length > 0 || newSRSItems.length > 0) && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                  <th className="text-left px-3 py-2">SRS #</th>
                  <th className="text-left px-3 py-2">Style</th>
                  <th className="text-left px-3 py-2">Color / Print</th>
                  <th className="text-left px-3 py-2 w-40">Outcome</th>
                  <th className="text-left px-3 py-2">Comments</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {srsItems.map(item => (
                  <SRSItemRow key={item.id} item={item}
                    canEdit={canEditOutcome}
                    onUpdate={patch => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)} />
                ))}
                {newSRSItems.map(row => (
                  <NewSRSRow key={row._id} row={row}
                    allSRS={allSRS}
                    onChange={patch => setNewSRSItems(prev => prev.map(r => r._id === row._id ? { ...r, ...patch } : r))}
                    onSave={() => saveSRSRow(row)}
                    onCancel={() => setNewSRSItems(prev => prev.filter(r => r._id !== row._id))} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {srsItems.length === 0 && newSRSItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No SRS items yet</p>
        )}
      </SectionCard>

      {/* ── Section 3: Misc ─────────────────────────────────────────────────── */}
      <SectionCard
        title="Miscellaneous"
        subtitle="Ad-hoc items with no WIP linkage"
        colour="gray"
        onAdd={() => setNewMiscItems(prev => [...prev, blankMisc()])}>
        {(miscItems.length > 0 || newMiscItems.length > 0) && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b">
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {miscItems.map(item => (
                  <MiscItemRow key={item.id} item={item}
                    onUpdate={patch => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)} />
                ))}
                {newMiscItems.map(row => (
                  <NewMiscRow key={row._id} row={row}
                    onChange={patch => setNewMiscItems(prev => prev.map(r => r._id === row._id ? { ...r, ...patch } : r))}
                    onSave={() => saveMiscRow(row)}
                    onCancel={() => setNewMiscItems(prev => prev.filter(r => r._id !== row._id))} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {miscItems.length === 0 && newMiscItems.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No misc items yet</p>
        )}
      </SectionCard>
    </div>
  );
}

// ── Editable column header ────────────────────────────────────────────────────
function EditableHeader({ label, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(label);

  useEffect(() => { setVal(label); }, [label]);

  function commit() {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed !== label) onSave(trimmed);
  }

  if (editing) {
    return (
      <input
        className="w-full min-w-[40px] bg-transparent border-b border-blue-400 outline-none text-xs uppercase tracking-wide text-gray-600 font-semibold"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter')  commit();
          if (e.key === 'Escape') { setVal(label); setEditing(false); }
        }}
        autoFocus
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer group inline-flex items-center gap-1 select-none"
      title="Click to rename">
      {label}
      <span className="opacity-0 group-hover:opacity-40 text-gray-400 normal-case tracking-normal">✎</span>
    </span>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────
function SectionCard({ title, subtitle, colour, onAdd, children }) {
  const headerColours = {
    purple: 'border-l-4 border-purple-400',
    indigo: 'border-l-4 border-indigo-400',
    gray:   'border-l-4 border-gray-300',
  };
  return (
    <div className={`card mb-6 ${headerColours[colour] || ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onAdd} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          + Add Item
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Existing approval item row ────────────────────────────────────────────────
function ApprovalItemRow({ item, canEdit, onUpdate, onDelete }) {
  const [comments, setComments] = useState(item.comments || '');
  const [dirty,    setDirty]    = useState(false);
  const cell = item.wipCells?.[0]?.wipCell;
  const po   = cell?.poLineItem?.po;
  const style = cell?.poLineItem?.style;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="px-3 py-2">
        <span className="text-xs font-medium bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
          {item.approvalType}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-blue-600">
        {po ? <Link href={`/dashboard/purchase-orders/${po.id}`}>{po.poNo}</Link> : '—'}
      </td>
      <td className="px-3 py-2 text-xs">{style?.styleNo || '—'}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{item.colorPrint || cell?.poLineItem?.color || '—'}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{cell?.label || '—'}</td>
      <td className="px-3 py-2">
        {canEdit ? (
          <select className="select-field text-xs" value={item.approvalStatus}
            onChange={e => onUpdate({ approvalStatus: e.target.value })}>
            {APPROVAL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[item.approvalStatus] || ''}`}>
            {item.approvalStatus.replace(/_/g, ' ')}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <input className="input-field text-xs flex-1" value={comments}
            placeholder="Add comment…"
            onChange={e => { setComments(e.target.value); setDirty(true); }} />
          {dirty && (
            <button className="text-xs text-blue-600 font-medium px-2"
              onClick={() => { onUpdate({ comments }); setDirty(false); }}>
              Save
            </button>
          )}
        </div>
        {/* Comment history */}
        {item.wipCells?.[0]?.wipCell?.comments?.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {item.wipCells[0].wipCell.comments.map(c => (
              <div key={c.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-0.5">
                <span className={`inline-block w-2 h-2 rounded-full mr-1 ${STATUS_COLOURS[c.approvalStatus]?.split(' ')[0] || 'bg-gray-300'}`}></span>
                {c.text}
                <span className="ml-1 text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 text-xs">✕</button>
      </td>
    </tr>
  );
}

// ── PO type-to-search combobox ────────────────────────────────────────────────
// Renders the dropdown via a portal into document.body so it escapes any
// overflow:hidden / overflow-x:auto ancestor that would clip it.
function POCombobox({ pos, value, onChange }) {
  const selected = pos.find(p => p.id === value);
  const [query,   setQuery]   = useState(selected?.poNo || '');
  const [open,    setOpen]    = useState(false);
  const [rect,    setRect]    = useState(null);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  // Keep display text in sync if parent clears the value
  useEffect(() => {
    setQuery(pos.find(p => p.id === value)?.poNo || '');
  }, [value, pos]);

  // Close on click outside
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function openDropdown() {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setOpen(true);
  }

  const filtered = query.trim()
    ? pos.filter(p => p.poNo.toLowerCase().includes(query.toLowerCase()))
    : pos;

  function select(p) {
    onChange(p.id);
    setQuery(p.poNo);
    setOpen(false);
  }

  function handleInput(e) {
    setQuery(e.target.value);
    if (value) onChange('');
    openDropdown();
  }

  const dropStyle = rect ? {
    position: 'fixed',
    top:      rect.bottom + 2,
    left:     rect.left,
    width:    rect.width,
    zIndex:   9999,
  } : {};

  return (
    <div ref={wrapRef}>
      <input
        ref={inputRef}
        className="input-field text-xs w-full"
        value={query}
        placeholder="Search PO…"
        onChange={handleInput}
        onFocus={openDropdown}
      />
      {open && rect && filtered.length > 0 && createPortal(
        <ul style={dropStyle}
          className="bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto text-xs">
          {filtered.slice(0, 60).map(p => (
            <li key={p.id}
              className={`px-3 py-1.5 cursor-pointer hover:bg-blue-50 ${p.id === value ? 'bg-blue-50 font-medium' : ''}`}
              onMouseDown={() => select(p)}>
              {p.poNo}
            </li>
          ))}
        </ul>,
        document.body
      )}
      {open && rect && query.trim() && filtered.length === 0 && createPortal(
        <div style={dropStyle}
          className="bg-white border border-gray-200 rounded shadow-lg px-3 py-2 text-xs text-gray-400">
          No POs match "{query}"
        </div>,
        document.body
      )}
    </div>
  );
}

// ── New approval row (not yet saved) ─────────────────────────────────────────
function NewApprovalRow({ row, pos, poLinesCache, onLoadPOLines, onChange, onSave, onCancel }) {
  const lines = poLinesCache[row.poId] || [];
  const [rowSaving, setRowSaving] = useState(false);

  function handlePOChange(poId) {
    onChange({ poId, poLineItemId: '' });
    onLoadPOLines(poId);
  }

  async function handleSave() {
    setRowSaving(true);
    try { await onSave(); } finally { setRowSaving(false); }
  }

  const isCustom = row.approvalType === 'CUSTOM';

  return (
    <tr className="border-b bg-blue-50/30">
      <td className="px-3 py-2 space-y-1">
        <select className="select-field text-xs w-full" value={row.approvalType}
          onChange={e => onChange({ approvalType: e.target.value, label: e.target.value === 'CUSTOM' ? '' : e.target.value })}>
          {ALL_APPROVAL_TYPES.map(t => <option key={t} value={t}>{t === 'CUSTOM' ? '— Custom type…' : t.replace(/_/g, ' ')}</option>)}
        </select>
        {isCustom && (
          <>
            <input className="input-field text-xs w-full" value={row.label}
              placeholder="Custom type name (required)"
              onChange={e => onChange({ label: e.target.value })} autoFocus />
            <select className="select-field text-xs w-full" value={row.customSegment || 'SAMPLES'}
              onChange={e => onChange({ customSegment: e.target.value })}>
              {WIP_SEGMENTS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </>
        )}
      </td>
      <td className="px-3 py-2">
        <POCombobox
          pos={pos}
          value={row.poId}
          onChange={handlePOChange}
        />
      </td>
      <td className="px-3 py-2">
        <select className="select-field text-xs" value={row.poLineItemId}
          onChange={e => {
            const line = lines.find(l => l.id === e.target.value);
            onChange({ poLineItemId: e.target.value, colorPrint: line?.color || '' });
          }}
          disabled={!row.poId}>
          <option value="">Select line…</option>
          {lines.map(l => (
            <option key={l.id} value={l.id}>
              {l.style?.styleNo || l.styleId}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input className="input-field text-xs" value={row.colorPrint} placeholder="Color / print"
          onChange={e => onChange({ colorPrint: e.target.value })} />
      </td>
      <td className="px-3 py-2">
        {!isCustom && (
          <input className="input-field text-xs" value={row.label} placeholder={row.approvalType}
            onChange={e => onChange({ label: e.target.value })} />
        )}
        {isCustom && <span className="text-xs text-gray-400 italic">(set in Type column)</span>}
      </td>
      <td className="px-3 py-2 text-xs text-gray-400">—</td>
      <td className="px-3 py-2 text-xs text-gray-400">—</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave}
            disabled={rowSaving || !row.approvalType || !row.poLineItemId || (isCustom && !row.label?.trim())}
            className="text-xs text-green-600 font-medium disabled:opacity-40">
            {rowSaving ? '…' : '✓'}
          </button>
          <button onClick={onCancel} disabled={rowSaving} className="text-xs text-gray-400 disabled:opacity-40">✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── Existing SRS item row ─────────────────────────────────────────────────────
function SRSItemRow({ item, canEdit, onUpdate, onDelete }) {
  const [comments, setComments] = useState(item.comments || '');
  const [dirty,    setDirty]    = useState(false);
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="px-3 py-2 text-xs font-medium text-indigo-600">
        <Link href={`/dashboard/srs/${item.srs?.id}`}>{item.srs?.srsNo || '—'}</Link>
      </td>
      <td className="px-3 py-2 text-xs">{item.srs?.styleNo || '—'}</td>
      <td className="px-3 py-2 text-xs text-gray-500">{item.colorPrint || item.srs?.colorPrint || '—'}</td>
      <td className="px-3 py-2">
        {canEdit ? (
          <select className="select-field text-xs" value={item.approvalStatus}
            onChange={e => onUpdate({ approvalStatus: e.target.value })}>
            {APPROVAL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[item.approvalStatus] || ''}`}>
            {item.approvalStatus.replace(/_/g, ' ')}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <input className="input-field text-xs flex-1" value={comments}
            placeholder="Add comment…"
            onChange={e => { setComments(e.target.value); setDirty(true); }} />
          {dirty && (
            <button className="text-xs text-blue-600 font-medium px-2"
              onClick={() => { onUpdate({ comments }); setDirty(false); }}>
              Save
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 text-xs">✕</button>
      </td>
    </tr>
  );
}

// ── New SRS row ───────────────────────────────────────────────────────────────
function NewSRSRow({ row, allSRS, onChange, onSave, onCancel }) {
  const [rowSaving, setRowSaving] = useState(false);
  async function handleSave() {
    setRowSaving(true);
    try { await onSave(); } finally { setRowSaving(false); }
  }
  return (
    <tr className="border-b bg-indigo-50/30">
      <td className="px-3 py-2">
        <select className="select-field text-xs" value={row.srsId}
          onChange={e => {
            const srs = allSRS.find(s => s.id === e.target.value);
            onChange({ srsId: e.target.value, colorPrint: srs?.colorPrint || '' });
          }}>
          <option value="">Select SRS…</option>
          {allSRS.map(s => (
            <option key={s.id} value={s.id}>{s.srsNo} — {s.styleNo}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-xs text-gray-400">
        {allSRS.find(s => s.id === row.srsId)?.styleNo || '—'}
      </td>
      <td className="px-3 py-2">
        <input className="input-field text-xs" value={row.colorPrint} placeholder="Color / print"
          onChange={e => onChange({ colorPrint: e.target.value })} />
      </td>
      <td className="px-3 py-2 text-xs text-gray-400" colSpan={2}>—</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={rowSaving || !row.srsId}
            className="text-xs text-green-600 font-medium disabled:opacity-40">
            {rowSaving ? '…' : '✓'}
          </button>
          <button onClick={onCancel} disabled={rowSaving} className="text-xs text-gray-400 disabled:opacity-40">✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── Existing misc row ─────────────────────────────────────────────────────────
function MiscItemRow({ item, onUpdate, onDelete }) {
  const [desc,  setDesc]  = useState(item.description || '');
  const [dirty, setDirty] = useState(false);
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <input className="input-field text-xs flex-1" value={desc}
            onChange={e => { setDesc(e.target.value); setDirty(true); }} />
          {dirty && (
            <button className="text-xs text-blue-600 font-medium px-2"
              onClick={() => { onUpdate({ description: desc }); setDirty(false); }}>
              Save
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 text-xs">✕</button>
      </td>
    </tr>
  );
}

// ── New misc row ──────────────────────────────────────────────────────────────
function NewMiscRow({ row, onChange, onSave, onCancel }) {
  const [rowSaving, setRowSaving] = useState(false);
  async function handleSave() {
    setRowSaving(true);
    try { await onSave(); } finally { setRowSaving(false); }
  }
  return (
    <tr className="border-b bg-gray-50/50">
      <td className="px-3 py-2">
        <input className="input-field text-xs w-full" value={row.description}
          placeholder="Description…"
          onChange={e => onChange({ description: e.target.value })} />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={rowSaving || !row.description?.trim()}
            className="text-xs text-green-600 font-medium disabled:opacity-40">
            {rowSaving ? '…' : '✓'}
          </button>
          <button onClick={onCancel} disabled={rowSaving} className="text-xs text-gray-400 disabled:opacity-40">✕</button>
        </div>
      </td>
    </tr>
  );
}
