// src/app/(dashboard)/dashboard/costing/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function CostingPage() {
  const [costingSheets, setCostingSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [styles, setStyles] = useState([]);
  const [srsList, setSRSList] = useState([]);
  const [formData, setFormData] = useState({
    styleId: '',
    srsId: '',
    versionLabel: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCostingSheets();
    fetchStyles();
    fetchSRSList();
  }, []);

  const fetchCostingSheets = () => {
    setLoading(true);
    fetch('/api/costing-sheets')
      .then(r => r.json())
      .then(d => setCostingSheets(d || []))
      .finally(() => setLoading(false));
  };

  const fetchStyles = () => {
    fetch('/api/styles')
      .then(r => r.json())
      .then(d => setStyles(d.styles || []))
      .catch(() => setStyles([]));
  };

  const fetchSRSList = () => {
    fetch('/api/srs')
      .then(r => r.json())
      .then(d => setSRSList(d.srsList || []))
      .catch(() => setSRSList([]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.styleId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/costing-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const newSheet = await res.json();
        setIsModalOpen(false);
        setFormData({ styleId: '', srsId: '', versionLabel: '' });
        window.location.href = '/dashboard/costing/' + newSheet.id;
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create costing sheet');
      }
    } catch (error) {
      alert('Failed to create costing sheet');
    } finally {
      setSubmitting(false);
    }
  };

  const getSource = (sheet) => {
    if (sheet.srsId) return 'SRS';
    return 'Direct';
  };

  const getQuotedPrice = (sheet) => {
    if (sheet.actualQuotedPrice) {
      return (sheet.quoteCurrency || 'USD') + ' ' + Number(sheet.actualQuotedPrice).toFixed(2);
    }
    if (sheet.sellingPrice && Number(sheet.sellingPrice) > 0) {
      return (sheet.quoteCurrency || 'USD') + ' ' + Number(sheet.sellingPrice).toFixed(2);
    }
    return '—';
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div>
      <PageHeader 
        title="Costing Sheets" 
        subtitle="Cost estimation and pricing management"
        action={{ label: '+ New Costing Sheet', onClick: () => setIsModalOpen(true) }}
      />

      <div className="card overflow-hidden p-0">
        <table className="table-base">
          <thead>
            <tr>
              <th>Style #</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Version</th>
              <th>Quoted Price</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {costingSheets.map(sheet => (
              <tr key={sheet.id}>
                <td className="font-medium">{sheet.style?.styleNo || sheet.srs?.styleNo || '—'}</td>
                <td>{sheet.style?.customer?.name || '—'}</td>
                <td>
                  <span className={"inline-flex items-center px-2 py-0.5 rounded text-xs font-medium " + (getSource(sheet) === 'SRS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800')}>
                    {getSource(sheet)}
                  </span>
                </td>
                <td>{sheet.versionLabel || ('Rev ' + sheet.revisionNo)}</td>
                <td className="font-medium text-green-600">{getQuotedPrice(sheet)}</td>
                <td className="text-gray-500 text-sm">
                  {new Date(sheet.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <Link href={'/dashboard/costing/' + sheet.id} className="text-blue-600 text-sm hover:underline">
                    Edit →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {costingSheets.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No costing sheets yet</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Create your first costing sheet
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">New Costing Sheet</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.styleId}
                  onChange={(e) => setFormData({ ...formData, styleId: e.target.value })}
                  required
                >
                  <option value="">Select a style...</option>
                  {styles.map(style => (
                    <option key={style.id} value={style.id}>
                      {style.styleNo} - {style.description || 'No description'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SRS (Optional)
                </label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.srsId}
                  onChange={(e) => setFormData({ ...formData, srsId: e.target.value })}
                >
                  <option value="">None (Direct)</option>
                  {srsList.map(srs => (
                    <option key={srs.id} value={srs.id}>
                      {srs.srsNo} - {srs.styleNo}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Link to an SRS request, or leave empty for direct costing
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version Label
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={formData.versionLabel}
                  onChange={(e) => setFormData({ ...formData, versionLabel: e.target.value })}
                  placeholder="e.g., Initial, After negotiation"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting || !formData.styleId}
                >
                  {submitting ? 'Creating...' : 'Create Costing Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
