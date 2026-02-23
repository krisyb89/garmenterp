// src/app/(dashboard)/dashboard/packages/[id]/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
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

  // Load POLines for a given PO (cached)
  async function loadPOLines(poId) {
    if (!poId || poLinesCache[poId]) return;
    const res  = await fetch(`/api/purchase-orders/${poId}`);
    const data = await res.json();
    setPoLinesCache(prev => ({ ...prev, [poId]: data.lineItems || data.po?.lineItems || [] }));
  }

  // ── Save header ──────────────────────────────────────────────────────────
  async function saveHeader() {
    setSaving(true);
    try {
      await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hdr),
      });
      setSaveMsg('Saved'); setTimeout(() => setSaveMsg(''), 2000);
    } finally { setSaving(false); }
  }

  // ── Status transitions ────────────────────────────────────────────────────
  async function setStatus(status) {
    setSaving(true);
    try {
      await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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
      setNewApprovals(prev => prev.filter(r => r._id !== row._id));
      loadPkg();
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
      setNewSRSItems(prev => prev.filter(r => r._id !== row._id));
      loadPkg();
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
      setNewMiscItems(prev => prev.filter(r => r._id !== row._id));
      loadPkg();
    }
  }

  // ── Update existing item outcome / comments ───────────────────────────────
  async function updateItem(itemId, patch) {
    await fetch(`/api/packages/${id}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    loadPkg();
  }

  async function deleteItem(itemId) {
    await fetch(`/api/packages/${id}/items/${itemId}`, { method: 'DELETE' });
    loadPkg();
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
            <select className="select-field w-full text-sm" value={hdr.courier} onChange={e => setHdr(p => ({ ...p, courier: e.target.value }))}>
              <option value="">— Select —</option>
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tracking #</label>
            <div className="flex items-center gap-1">
              <input className="input-field flex-1 text-sm" value={hdr.trackingNo}
                placeholder="e.g. 1Z999AA10123456784"
                onChange={e => setHdr(p => ({ ...p, trackingNo: e.target.value }))} />
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
              onChange={e => setHdr(p => ({ ...p, dateSent: e.target.value }))} />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <input className="input-field w-full text-sm" value={hdr.notes}
            onChange={e => setHdr(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={saveHeader} disabled={saving} className="btn-primary text-xs">
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
                  <th className="text-left px-3 py-2 w-32">Type</th>
                  <th className="text-left px-3 py-2">PO</th>
                  <th className="text-left px-3 py-2">Style / Line</th>
                  <th className="text-left px-3 py-2">Color / Print</th>
                  <th className="text-left px-3 py-2 w-32">Label</th>
                  <th className="text-left px-3 py-2 w-40">Outcome</th>
                  <th className="text-left px-3 py-2">Comments</th>
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

// ── New approval row (not yet saved) ─────────────────────────────────────────
function NewApprovalRow({ row, pos, poLinesCache, onLoadPOLines, onChange, onSave, onCancel }) {
  const lines = poLinesCache[row.poId] || [];

  function handlePOChange(poId) {
    onChange({ poId, poLineItemId: '' });
    onLoadPOLines(poId);
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
        <select className="select-field text-xs" value={row.poId} onChange={e => handlePOChange(e.target.value)}>
          <option value="">Select PO…</option>
          {pos.map(p => <option key={p.id} value={p.id}>{p.poNo}</option>)}
        </select>
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
              {l.style?.styleNo || l.styleId} — {l.color}
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
          <button onClick={onSave}
            disabled={!row.approvalType || !row.poLineItemId || (isCustom && !row.label?.trim())}
            className="text-xs text-green-600 font-medium disabled:opacity-40">✓</button>
          <button onClick={onCancel} className="text-xs text-gray-400">✕</button>
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
          <button onClick={onSave} disabled={!row.srsId}
            className="text-xs text-green-600 font-medium disabled:opacity-40">✓</button>
          <button onClick={onCancel} className="text-xs text-gray-400">✕</button>
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
  return (
    <tr className="border-b bg-gray-50/50">
      <td className="px-3 py-2">
        <input className="input-field text-xs w-full" value={row.description}
          placeholder="Description…"
          onChange={e => onChange({ description: e.target.value })} />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button onClick={onSave} disabled={!row.description?.trim()}
            className="text-xs text-green-600 font-medium disabled:opacity-40">✓</button>
          <button onClick={onCancel} className="text-xs text-gray-400">✕</button>
        </div>
      </td>
    </tr>
  );
}
