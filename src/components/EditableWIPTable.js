// src/components/EditableWIPTable.js
'use client';

import { useEffect, useMemo, useState } from 'react';

function safeVal(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default function EditableWIPTable({
  scope, // 'SRS' | 'PO'
  fetchUrl,
  updateRow,
  baseColumns,
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [newCol, setNewCol] = useState({ key: '', label: '' });

  useEffect(() => {
    setLoading(true);
    fetch(fetchUrl)
      .then(r => r.json())
      .then(d => {
        setRows(d.rows || []);
        setColumns(d.columns || []);
      })
      .finally(() => setLoading(false));
  }, [fetchUrl]);

  const allColumns = useMemo(() => {
    const custom = columns.map(c => ({ key: c.key, label: c.label, isCustom: true, dataType: c.dataType, options: c.options }));
    return [...baseColumns, ...custom];
  }, [baseColumns, columns]);

  async function saveRow(id, nextWipData) {
    setSavingId(id);
    try {
      const res = await updateRow(id, nextWipData);
      if (!res.ok) throw new Error('save failed');
      const payload = await res.json();
      setRows(prev => prev.map(r => (r.id === id ? { ...r, wipData: payload.wipData } : r)));
    } catch (e) {
      console.error(e);
      alert('Failed to save WIP cell');
    } finally {
      setSavingId(null);
    }
  }

  async function createColumn() {
    const key = newCol.key.trim();
    const label = newCol.label.trim();
    if (!key || !label) return;
    const res = await fetch('/api/wip/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, key, label, dataType: 'text', sortOrder: 999 }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to create column');
      return;
    }
    setColumns(prev => [...prev, data]);
    setNewCol({ key: '', label: '' });
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="label-field">Add Custom Column (for this {scope} WIP)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="input-field" placeholder="key (e.g., sample_eta)" value={newCol.key} onChange={e => setNewCol(p => ({ ...p, key: e.target.value }))} />
              <input className="input-field" placeholder="label (e.g., Sample ETA)" value={newCol.label} onChange={e => setNewCol(p => ({ ...p, label: e.target.value }))} />
              <button type="button" className="btn-primary" onClick={createColumn}>Add Column</button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Keys should be stable (snake_case). Values are stored per row in JSON.</p>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b">
              {allColumns.map(c => (
                <th key={c.key} className="text-left font-semibold text-gray-600 py-3 px-2 whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-0">
                {allColumns.map(c => {
                  if (!c.isCustom) {
                    return (
                      <td key={c.key} className="py-2 px-2 whitespace-nowrap">
                        {c.render ? c.render(r) : safeVal(r[c.key])}
                      </td>
                    );
                  }
                  const v = r.wipData?.[c.key] ?? '';
                  return (
                    <td key={c.key} className="py-2 px-2">
                      <input
                        className="input-field !py-1 !px-2"
                        value={safeVal(v)}
                        disabled={savingId === r.id}
                        onChange={e => {
                          const next = { ...(r.wipData || {}), [c.key]: e.target.value };
                          setRows(prev => prev.map(x => (x.id === r.id ? { ...x, wipData: next } : x)));
                        }}
                        onBlur={() => saveRow(r.id, r.wipData || {})}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
