// src/app/(dashboard)/dashboard/packages/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

// ── Constants ─────────────────────────────────────────────────────────────────

const PKG_STATUS_COLOURS = {
  DRAFT:    'bg-gray-100 text-gray-600',
  SENT:     'bg-blue-100 text-blue-700',
  RECEIVED: 'bg-green-100 text-green-700',
  COMPLETE: 'bg-emerald-100 text-emerald-700',
};

const ITEM_STATUS_COLOURS = {
  PENDING:                'bg-gray-100 text-gray-500',
  SUBMITTED:              'bg-blue-50 text-blue-600',
  APPROVED:               'bg-green-100 text-green-700',
  REJECTED:               'bg-red-100 text-red-600',
  RESUBMIT:               'bg-yellow-100 text-yellow-700',
  APPROVED_WITH_COMMENTS: 'bg-teal-100 text-teal-700',
};

const SECTION_TAG = {
  APPROVAL: 'bg-purple-100 text-purple-700',
  SRS:      'bg-indigo-100 text-indigo-700',
  MISC:     'bg-gray-100 text-gray-500',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PackagesPage() {
  const [packages,    setPackages]    = useState([]);
  const [tab,         setTab]         = useState('pending');  // 'pending' | 'complete'
  const [search,      setSearch]      = useState('');
  const [debouncedQ,  setDebouncedQ]  = useState('');
  const [loading,     setLoading]     = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadPackages = useCallback(() => {
    const p = new URLSearchParams({ tab });
    if (debouncedQ) p.set('search', debouncedQ);
    setLoading(true);
    fetch(`/api/packages?${p}`)
      .then(r => r.json())
      .then(d => setPackages(d.packages || []))
      .finally(() => setLoading(false));
  }, [tab, debouncedQ]);

  useEffect(() => { loadPackages(); }, [loadPackages]);

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Packages"
        subtitle="Track approval packages sent to customers"
        action={{ href: '/dashboard/packages/new', label: '+ New Package' }}
      />

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        {[
          { key: 'pending',  label: 'Pending' },
          { key: 'complete', label: 'Complete' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setExpandedIds(new Set()); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer, tracking #, style, or SRS#…"
          className="input-field w-full pl-8 pr-4 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : packages.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          {debouncedQ ? `No packages match "${debouncedQ}"` : `No ${tab} packages`}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="table-base">
            <thead>
              <tr>
                <th className="w-6"></th>
                <th>Customer</th>
                <th>Courier</th>
                <th>Tracking #</th>
                <th>Date Sent</th>
                <th>Items</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.flatMap(pkg => {
                const approvalCount = pkg.items.filter(i => i.section === 'APPROVAL').length;
                const srsCount      = pkg.items.filter(i => i.section === 'SRS').length;
                const miscCount     = pkg.items.filter(i => i.section === 'MISC').length;
                const isExpanded    = expandedIds.has(pkg.id);
                const hasItems      = pkg.items.length > 0;

                // Outcome progress for non-DRAFT packages
                const trackable    = pkg.items.filter(i => i.section !== 'MISC');
                const done         = trackable.filter(i => !['PENDING', 'SUBMITTED'].includes(i.approvalStatus));
                const showProgress = pkg.status !== 'DRAFT' && trackable.length > 0;

                const rows = [
                  // ── Main row ──────────────────────────────────────────
                  <tr
                    key={pkg.id}
                    className={`cursor-pointer hover:bg-gray-50/70 ${isExpanded ? 'bg-gray-50/50' : ''}`}
                    onClick={() => hasItems && toggleExpand(pkg.id)}
                  >
                    <td className="px-2 text-center text-gray-400 text-xs select-none">
                      {hasItems ? (isExpanded ? '▾' : '▸') : ''}
                    </td>
                    <td className="font-medium">{pkg.customer?.name}</td>
                    <td className="text-xs text-gray-500">{pkg.courier || '—'}</td>
                    <td className="text-xs text-gray-500 font-mono">{pkg.trackingNo || '—'}</td>
                    <td className="text-xs">{pkg.dateSent ? new Date(pkg.dateSent).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="flex gap-1 text-xs flex-wrap items-center">
                        {approvalCount > 0 && (
                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            {approvalCount} approval{approvalCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {srsCount > 0 && (
                          <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                            {srsCount} SRS
                          </span>
                        )}
                        {miscCount > 0 && (
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {miscCount} misc
                          </span>
                        )}
                        {pkg.items.length === 0 && <span className="text-gray-400">Empty</span>}
                        {showProgress && (
                          <span className={`ml-1 text-xs ${done.length === trackable.length ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                            {done.length}/{trackable.length} done
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PKG_STATUS_COLOURS[pkg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {pkg.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <Link href={`/dashboard/packages/${pkg.id}`} className="text-blue-600 text-sm hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>,
                ];

                // ── Expanded detail row ────────────────────────────────
                if (isExpanded) {
                  rows.push(
                    <tr key={`${pkg.id}-expand`} className="bg-gray-50/70">
                      <td></td>
                      <td colSpan={7} className="px-3 pb-3 pt-0">
                        <ItemsPreview items={pkg.items} />
                      </td>
                    </tr>
                  );
                }

                return rows;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Expandable items preview ──────────────────────────────────────────────────

function ItemsPreview({ items }) {
  if (!items.length) return null;

  const approvals = items.filter(i => i.section === 'APPROVAL');
  const srsItems  = items.filter(i => i.section === 'SRS');
  const misc      = items.filter(i => i.section === 'MISC');

  return (
    <div className="border border-gray-200 rounded overflow-hidden text-xs mt-1">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100 text-gray-500 uppercase tracking-wide text-[10px]">
            <th className="text-left px-3 py-1.5 w-24">Type</th>
            <th className="text-left px-3 py-1.5">Reference</th>
            <th className="text-left px-3 py-1.5">Style</th>
            <th className="text-left px-3 py-1.5">Color / Print</th>
            <th className="text-left px-3 py-1.5 w-36">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {approvals.map(item => {
            const cell  = item.wipCells?.[0]?.wipCell;
            const style = cell?.poLineItem?.style?.styleNo;
            const po    = cell?.poLineItem?.po?.poNo;
            return (
              <tr key={item.id} className="bg-white hover:bg-purple-50/30">
                <td className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SECTION_TAG.APPROVAL}`}>
                    {item.approvalType?.replace(/_/g, ' ') || 'APPROVAL'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-gray-500">
                  {cell?.label || '—'}
                  {po && <span className="ml-1 text-gray-400 text-[10px]">({po})</span>}
                </td>
                <td className="px-3 py-1.5 text-gray-600">{style || '—'}</td>
                <td className="px-3 py-1.5 text-gray-500">{item.colorPrint || cell?.poLineItem?.color || '—'}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ITEM_STATUS_COLOURS[item.approvalStatus] || 'bg-gray-100'}`}>
                    {item.approvalStatus?.replace(/_/g, ' ') || '—'}
                  </span>
                </td>
              </tr>
            );
          })}
          {srsItems.map(item => (
            <tr key={item.id} className="bg-white hover:bg-indigo-50/30">
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SECTION_TAG.SRS}`}>
                  SRS
                </span>
              </td>
              <td className="px-3 py-1.5 text-indigo-600 font-medium">{item.srs?.srsNo || '—'}</td>
              <td className="px-3 py-1.5 text-gray-600">{item.srs?.styleNo || '—'}</td>
              <td className="px-3 py-1.5 text-gray-500">{item.colorPrint || item.srs?.colorPrint || '—'}</td>
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ITEM_STATUS_COLOURS[item.approvalStatus] || 'bg-gray-100'}`}>
                  {item.approvalStatus?.replace(/_/g, ' ') || '—'}
                </span>
              </td>
            </tr>
          ))}
          {misc.map(item => (
            <tr key={item.id} className="bg-white hover:bg-gray-50">
              <td className="px-3 py-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SECTION_TAG.MISC}`}>
                  MISC
                </span>
              </td>
              <td className="px-3 py-1.5 text-gray-500" colSpan={3}>{item.description || '—'}</td>
              <td className="px-3 py-1.5 text-gray-400">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
