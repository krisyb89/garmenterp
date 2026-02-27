'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';

const approvalTypes = ['LAB_DIP','FABRIC','TRIM','PRINT_STRIKEOFF','EMBROIDERY_STRIKEOFF','WASH','FIT'];
const approvalSlots = ['','SELF','CONTRAST','TRIM_1','TRIM_2'];
const sampleStages = ['PROTO','FIT','PP','TOP','SHIPMENT','GPT'];
const kinds = ['APPROVAL','SAMPLE'];

export default function WIPColumnsAdminPage() {
  const [scope, setScope] = useState('PRODUCTION');
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newCol, setNewCol] = useState({
    key: '',
    label: '',
    kind: 'APPROVAL',
    groupName: 'Approvals',
    approvalType: 'FABRIC',
    approvalSlot: 'SELF',
    sampleStage: 'FIT',
    sortOrder: 999,
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/wip/columns?scope=${scope}`);
      const data = await r.json();
      setColumns(data.columns || []);
    } catch (e) {
      console.error(e);
      setError('Failed to load columns');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const dirtyColumns = useMemo(() => {
    return columns.map((c, i) => ({ ...c, sortOrder: Number.isFinite(c.sortOrder) ? c.sortOrder : i * 10 }));
  }, [columns]);

  function updateCol(id, patch) {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function saveAll() {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/wip/columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, columns: dirtyColumns }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Save failed');
      setColumns(data.columns || []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function addColumn() {
    setSaving(true);
    setError('');
    try {
      if (!newCol.key.trim() || !newCol.label.trim()) throw new Error('Key and Label are required');
      const payload = { scope, ...newCol };
      // Clean based on kind
      if (payload.kind === 'SAMPLE') {
        payload.groupName = 'Samples';
        payload.approvalType = null;
        payload.approvalSlot = null;
      } else {
        payload.groupName = 'Approvals';
        payload.sampleStage = null;
        if (!payload.approvalType) throw new Error('Approval Type is required');
      }

      const r = await fetch('/api/wip/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to add column');
      setColumns((prev) => [...prev, data]);
      setNewCol((p) => ({ ...p, key: '', label: '' }));
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to add column');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="WIP Column Config"
        subtitle="Admin: configure milestone columns for spreadsheet views (Production WIP Samples/Approvals)"
      />

      <div className="flex items-center gap-2 mb-4">
        <div className="text-xs text-gray-500">Scope:</div>
        <select
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          <option value="PRODUCTION">PRODUCTION</option>
          <option value="SRS">SRS</option>
          <option value="PO">PO</option>
        </select>
        <button
          onClick={load}
          className="ml-auto px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          Refresh
        </button>
        <button
          onClick={saveAll}
          disabled={saving}
          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Active</th>
                  <th className="p-2 text-left">Sort</th>
                  <th className="p-2 text-left">Key</th>
                  <th className="p-2 text-left">Label</th>
                  <th className="p-2 text-left">Kind</th>
                  <th className="p-2 text-left">Approval Type</th>
                  <th className="p-2 text-left">Slot</th>
                  <th className="p-2 text-left">Sample Stage</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={!!c.isActive}
                        onChange={(e) => updateCol(c.id, { isActive: e.target.checked })}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        className="w-20 border border-gray-200 rounded px-2 py-1"
                        value={c.sortOrder ?? 0}
                        onChange={(e) => updateCol(c.id, { sortOrder: Number(e.target.value) })}
                      />
                    </td>
                    <td className="p-2 font-mono text-xs text-gray-600">{c.key}</td>
                    <td className="p-2">
                      <input
                        className="w-56 border border-gray-200 rounded px-2 py-1"
                        value={c.label || ''}
                        onChange={(e) => updateCol(c.id, { label: e.target.value })}
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="border border-gray-200 rounded px-2 py-1"
                        value={(c.kind || 'FIELD').toUpperCase()}
                        onChange={(e) => {
                          const kind = e.target.value;
                          updateCol(c.id, {
                            kind,
                            groupName: kind === 'SAMPLE' ? 'Samples' : (kind === 'APPROVAL' ? 'Approvals' : null),
                            approvalType: kind === 'APPROVAL' ? (c.approvalType || 'FABRIC') : null,
                            approvalSlot: kind === 'APPROVAL' ? (c.approvalSlot || null) : null,
                            sampleStage: kind === 'SAMPLE' ? (c.sampleStage || 'FIT') : null,
                          });
                        }}
                      >
                        {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        className="border border-gray-200 rounded px-2 py-1"
                        value={c.approvalType || ''}
                        onChange={(e) => updateCol(c.id, { approvalType: e.target.value || null })}
                        disabled={(c.kind || '').toUpperCase() !== 'APPROVAL'}
                      >
                        <option value="">—</option>
                        {approvalTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        className="border border-gray-200 rounded px-2 py-1"
                        value={c.approvalSlot || ''}
                        onChange={(e) => updateCol(c.id, { approvalSlot: e.target.value || null })}
                        disabled={(c.kind || '').toUpperCase() !== 'APPROVAL'}
                      >
                        {approvalSlots.map((s) => <option key={s || 'empty'} value={s}>{s || '—'}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        className="border border-gray-200 rounded px-2 py-1"
                        value={c.sampleStage || ''}
                        onChange={(e) => updateCol(c.id, { sampleStage: e.target.value || null })}
                        disabled={(c.kind || '').toUpperCase() !== 'SAMPLE'}
                      >
                        <option value="">—</option>
                        {sampleStages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}

                {/* Add new */}
                <tr className="bg-gray-50">
                  <td className="p-2"><input type="checkbox" checked={!!newCol.isActive} onChange={(e) => setNewCol(p => ({...p, isActive: e.target.checked}))} /></td>
                  <td className="p-2">
                    <input className="w-20 border border-gray-200 rounded px-2 py-1" value={newCol.sortOrder}
                      onChange={(e) => setNewCol(p => ({...p, sortOrder: Number(e.target.value)}))} />
                  </td>
                  <td className="p-2">
                    <input className="w-40 border border-gray-200 rounded px-2 py-1 font-mono text-xs" placeholder="KEY" value={newCol.key}
                      onChange={(e) => setNewCol(p => ({...p, key: e.target.value}))} />
                  </td>
                  <td className="p-2">
                    <input className="w-56 border border-gray-200 rounded px-2 py-1" placeholder="Label" value={newCol.label}
                      onChange={(e) => setNewCol(p => ({...p, label: e.target.value}))} />
                  </td>
                  <td className="p-2">
                    <select className="border border-gray-200 rounded px-2 py-1" value={newCol.kind}
                      onChange={(e) => setNewCol(p => ({...p, kind: e.target.value}))}>
                      {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border border-gray-200 rounded px-2 py-1" value={newCol.approvalType}
                      onChange={(e) => setNewCol(p => ({...p, approvalType: e.target.value}))}
                      disabled={newCol.kind !== 'APPROVAL'}>
                      {approvalTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border border-gray-200 rounded px-2 py-1" value={newCol.approvalSlot}
                      onChange={(e) => setNewCol(p => ({...p, approvalSlot: e.target.value}))}
                      disabled={newCol.kind !== 'APPROVAL'}>
                      {approvalSlots.map((s) => <option key={s || 'empty'} value={s}>{s || '—'}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border border-gray-200 rounded px-2 py-1" value={newCol.sampleStage}
                      onChange={(e) => setNewCol(p => ({...p, sampleStage: e.target.value}))}
                      disabled={newCol.kind !== 'SAMPLE'}>
                      {sampleStages.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t flex justify-end">
            <button
              onClick={addColumn}
              disabled={saving}
              className="px-3 py-1.5 rounded bg-gray-900 hover:bg-black text-white text-sm disabled:opacity-60"
            >
              + Add Column
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
