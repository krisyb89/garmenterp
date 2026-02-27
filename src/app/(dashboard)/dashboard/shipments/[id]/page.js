// src/app/(dashboard)/dashboard/shipments/[id]/page.js
'use client';
import { useParams } from 'next/navigation';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const SHIP_STATUSES = ['BOOKING_MADE','CARGO_READY','LOADED','IN_TRANSIT','ARRIVED','CUSTOMS_CLEARED','DELIVERED'];

export default function ShipmentDetailPage() {
  const { id } = useParams();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/shipments/${id}`).then(r => r.json()).then(setShipment).finally(() => setLoading(false));
  }, [id]);

  async function updateField(data) {
    const res = await fetch(`/api/shipments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    const updated = await res.json();
    setShipment(prev => ({ ...prev, ...updated }));
  }

  // Derive unique POs from packing lists (must be before early returns)
  const derivedPOs = useMemo(() => {
    if (!shipment) return [];
    const poMap = {};
    (shipment.packingLists || []).forEach(pl => {
      if (pl.po) poMap[pl.po.id] = pl.po;
    });
    if (shipment.po) poMap[shipment.po.id] = shipment.po;
    return Object.values(poMap);
  }, [shipment]);

  // Format PO header
  const poHeaderText = useMemo(() => {
    if (derivedPOs.length === 0) return 'No POs linked';
    if (derivedPOs.length === 1) {
      const po = derivedPOs[0];
      return `PO: ${po.poNo} | ${po.customer?.name || 'Unknown Customer'}`;
    }
    const poNos = derivedPOs.map(p => p.poNo).join(', ');
    const customers = [...new Set(derivedPOs.map(p => p.customer?.name || 'Unknown'))].join(', ');
    return `POs: ${poNos} | Customers: ${customers}`;
  }, [derivedPOs]);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!shipment) return <div className="text-center py-20 text-red-500">Not found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/shipments" className="text-sm text-blue-600 mb-2 inline-block">← Shipments</Link>
          <h1 className="text-2xl font-bold">{shipment.shipmentNo}</h1>
          <p className="text-gray-500 text-sm">{poHeaderText}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={shipment.status} />
          <select className="select-field w-auto text-sm" value={shipment.status} onChange={e => updateField({ status: e.target.value })}>
            {SHIP_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Shipment Pipeline */}
      <div className="card mb-6">
        <div className="flex gap-1">
          {SHIP_STATUSES.map(s => {
            const idx = SHIP_STATUSES.indexOf(s);
            const currentIdx = SHIP_STATUSES.indexOf(shipment.status);
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={s} className={`flex-1 py-2 text-center text-xs font-medium rounded
                ${isCurrent ? 'bg-blue-500 text-white' : isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                {s.replace(/_/g, ' ')}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Shipping Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Method</dt><dd>{shipment.shipmentMethod?.replace(/_/g, ' ')}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Terms</dt><dd>{shipment.shippingTerms}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Port of Loading</dt><dd>{shipment.portOfLoading || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Port of Discharge</dt><dd>{shipment.portOfDischarge || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Vessel</dt><dd>{shipment.vesselName || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Container#</dt><dd>{shipment.containerNo || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">B/L#</dt><dd>{shipment.blNo || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Forwarder</dt><dd>{shipment.forwarderName || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Freight Cost</dt><dd>{shipment.freightCost ? `$${parseFloat(shipment.freightCost).toFixed(2)}` : '—'}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Key Dates</h2>
          <div className="space-y-3">
            {[
              { label: 'ETD (Est. Departure)', field: 'etd' },
              { label: 'ATD (Actual Departure)', field: 'atd' },
              { label: 'ETA (Est. Arrival)', field: 'eta' },
              { label: 'ATA (Actual Arrival)', field: 'ata' },
              { label: 'ROG (Receipt of Goods)', field: 'rogDate' },
            ].map(({ label, field }) => (
              <div key={field} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <input
                  type="date" className="input-field w-auto text-sm"
                  value={shipment[field] ? new Date(shipment[field]).toISOString().split('T')[0] : ''}
                  onChange={e => updateField({ [field]: e.target.value || null })}
                />
              </div>
            ))}
          </div>
          {shipment.rogDate && (
            <div className="mt-4 bg-green-50 rounded-lg p-3 text-sm text-green-700">
              <strong>ROG recorded:</strong> Payment due date will be calculated based on customer terms.
            </div>
          )}
        </div>

        {/* Packing Lists */}
        <PackingListsSection shipment={shipment} shipmentId={id} onRefresh={() => {
          fetch(`/api/shipments/${id}`).then(r => r.json()).then(setShipment);
        }} />


        {/* Documents - Customs Declaration */}
        <DocumentsSection shipmentId={id} />
      </div>
    </div>
  );
}

function PackingListsSection({ shipment, shipmentId, onRefresh }) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unassignedPLs, setUnassignedPLs] = useState([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [linkingPL, setLinkingPL] = useState(null);
  const [unlinkingPL, setUnlinkingPL] = useState(null);

  // Fetch unassigned packing lists when modal opens
  const openLinkModal = async () => {
    setShowLinkModal(true);
    setLoadingUnassigned(true);
    try {
      const res = await fetch('/api/packing-lists?unassigned=true');
      if (res.ok) {
        const data = await res.json();
        setUnassignedPLs(Array.isArray(data) ? data : data.packingLists || []);
      }
    } catch (err) {
      console.error('Failed to fetch unassigned packing lists', err);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  // Link a packing list to shipment
  const handleLinkPL = async (plId) => {
    setLinkingPL(plId);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/link-packing-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packingListId: plId }),
      });
      if (res.ok) {
        setShowLinkModal(false);
        setUnassignedPLs([]);
        onRefresh();
      } else {
        alert('Failed to link packing list');
      }
    } catch (err) {
      console.error('Error linking packing list', err);
      alert('Error linking packing list');
    } finally {
      setLinkingPL(null);
    }
  };

  // Unlink a packing list from shipment
  const handleUnlinkPL = async (plId) => {
    if (!confirm('Are you sure you want to unlink this packing list?')) return;

    setUnlinkingPL(plId);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/link-packing-list`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packingListId: plId }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to unlink packing list');
      }
    } catch (err) {
      console.error('Error unlinking packing list', err);
      alert('Error unlinking packing list');
    } finally {
      setUnlinkingPL(null);
    }
  };

  // Calculate aggregated totals
  const totals = useMemo(() => {
    const pls = shipment?.packingLists || [];
    return {
      count: pls.length,
      cartons: pls.reduce((sum, pl) => sum + (pl.totalCartons || 0), 0),
      qty: pls.reduce((sum, pl) => sum + (pl.totalQty || 0), 0),
      gw: pls.reduce((sum, pl) => sum + (parseFloat(pl.totalGrossWeight) || 0), 0),
      nw: pls.reduce((sum, pl) => sum + (parseFloat(pl.totalNetWeight) || 0), 0),
      cbm: pls.reduce((sum, pl) => sum + (parseFloat(pl.totalCBM) || 0), 0),
    };
  }, [shipment?.packingLists]);

  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Packing Lists</h2>
        <button
          onClick={openLinkModal}
          className="btn-primary text-sm"
        >
          + Link Packing List
        </button>
      </div>

      {/* Aggregate Summary */}
      {(shipment?.packingLists?.length || 0) > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Total PLs</div>
            <div className="font-semibold text-lg">{totals.count}</div>
          </div>
          <div>
            <div className="text-gray-600">Cartons</div>
            <div className="font-semibold text-lg">{totals.cartons}</div>
          </div>
          <div>
            <div className="text-gray-600">Qty</div>
            <div className="font-semibold text-lg">{totals.qty?.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-600">GW (kg)</div>
            <div className="font-semibold text-lg">{totals.gw?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-600">NW (kg)</div>
            <div className="font-semibold text-lg">{totals.nw?.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-600">CBM</div>
            <div className="font-semibold text-lg">{totals.cbm?.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Packing Lists Table */}
      {shipment?.packingLists?.length === 0 ? (
        <p className="text-sm text-gray-400">No packing lists linked</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr>
              <th>PL#</th>
              <th>PO#</th>
              <th>Customer</th>
              <th>Ex-Factory Date</th>
              <th>Cartons</th>
              <th>Qty</th>
              <th>GW (kg)</th>
              <th>CBM</th>
              <th>Action</th>
            </tr></thead>
            <tbody>
              {shipment?.packingLists?.map(pl => (
                <tr key={pl.id}>
                  <td className="font-medium">
                    <Link href={`/dashboard/packing-lists/${pl.id}`} className="text-blue-600 hover:underline">
                      {pl.packingListNo}
                    </Link>
                  </td>
                  <td>{pl.po?.poNo || '—'}</td>
                  <td>{pl.po?.customer?.name || '—'}</td>
                  <td className="text-sm">
                    {pl.exFtyDate ? new Date(pl.exFtyDate).toLocaleDateString() : '—'}
                  </td>
                  <td>{pl.totalCartons}</td>
                  <td>{pl.totalQty?.toLocaleString()}</td>
                  <td>{parseFloat(pl.totalGrossWeight || 0).toFixed(2)}</td>
                  <td>{parseFloat(pl.totalCBM || 0).toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => handleUnlinkPL(pl.id)}
                      disabled={unlinkingPL === pl.id}
                      className="text-red-600 hover:text-red-800 text-lg"
                      title="Unlink"
                    >
                      {unlinkingPL === pl.id ? '...' : '✕'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Link Packing List Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Link Packing List</h3>

            {loadingUnassigned ? (
              <p className="text-sm text-gray-400">Loading unassigned packing lists...</p>
            ) : unassignedPLs.length === 0 ? (
              <p className="text-sm text-gray-400">No unassigned packing lists available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base">
                  <thead><tr>
                    <th>PL#</th>
                    <th>PO#</th>
                    <th>Customer</th>
                    <th>Cartons</th>
                    <th>Pcs</th>
                    <th>Action</th>
                  </tr></thead>
                  <tbody>
                    {unassignedPLs.map(pl => (
                      <tr key={pl.id}>
                        <td className="font-medium">{pl.packingListNo}</td>
                        <td>{pl.po?.poNo || '—'}</td>
                        <td>{pl.po?.customer?.name || '—'}</td>
                        <td>{pl.totalCartons}</td>
                        <td>{pl.totalQty?.toLocaleString()}</td>
                        <td>
                          <button
                            onClick={() => handleLinkPL(pl.id)}
                            disabled={linkingPL === pl.id}
                            className="btn-primary text-sm"
                          >
                            {linkingPL === pl.id ? 'Linking...' : 'Link'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLinkModal(false)}
                className="btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsSection({ shipmentId }) {
  const [declarations, setDeclarations] = useState([]);
  const [loadingDecl, setLoadingDecl] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    consignorName: '',
    consignorCode: '',
    productionUnit: '',
    productionUnitCode: '',
    domesticSource: '',
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchDeclarations();
  }, [shipmentId]);

  const fetchDeclarations = async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/customs-declaration`);
      if (res.ok) {
        const data = await res.json();
        setDeclarations(Array.isArray(data) ? data : data.declarations || []);
      }
    } catch (err) {
      console.error('Failed to fetch declarations', err);
    } finally {
      setLoadingDecl(false);
    }
  };

  const handleGenerateDeclaration = async () => {
    if (!formData.consignorName || !formData.consignorCode || !formData.productionUnit || !formData.productionUnitCode) {
      alert('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/customs-declaration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consignorName: formData.consignorName,
          consignorCode: formData.consignorCode,
          productionUnit: formData.productionUnit,
          productionUnitCode: formData.productionUnitCode,
          domesticSource: formData.domesticSource,
          tradeCountry: '美国',
          destinationCountry: '美国',
        }),
      });

      if (res.ok) {
        const newDecl = await res.json();
        setShowModal(false);
        setFormData({ consignorName: '', consignorCode: '', productionUnit: '', productionUnitCode: '', domesticSource: '' });
        window.location.href = `/dashboard/shipments/${shipmentId}/customs-declaration/${newDecl.id}`;
      } else {
        alert('Failed to generate customs declaration');
      }
    } catch (err) {
      console.error('Error generating declaration', err);
      alert('Error generating customs declaration');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Documents</h2>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary text-sm"
        >
          Generate 报关单
        </button>
      </div>

      {/* Customs Declarations List */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Customs Declarations</h3>
        {loadingDecl ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : declarations.length === 0 ? (
          <p className="text-sm text-gray-400">No customs declarations yet</p>
        ) : (
          <table className="table-base">
            <thead><tr><th>Declaration No</th><th>Customs No</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
            <tbody>
              {declarations.map(decl => (
                <tr key={decl.id}>
                  <td className="font-medium">{decl.declarationNo || '—'}</td>
                  <td>{decl.customsNo || '—'}</td>
                  <td className="text-sm text-gray-600">{decl.status || 'DRAFT'}</td>
                  <td className="text-sm text-gray-600">{decl.createdAt ? new Date(decl.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <Link href={`/dashboard/shipments/${shipmentId}/customs-declaration/${decl.id}`} className="text-blue-600 text-sm hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for generating declaration */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Generate 报关单</h3>
            <div className="space-y-3">
              <div>
                <label className="label-field">Consignor Name *</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.consignorName}
                  onChange={e => setFormData({ ...formData, consignorName: e.target.value })}
                  placeholder="e.g. ABC Trading Co."
                />
              </div>
              <div>
                <label className="label-field">Consignor Code *</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.consignorCode}
                  onChange={e => setFormData({ ...formData, consignorCode: e.target.value })}
                  placeholder="e.g. 1234567890"
                />
              </div>
              <div>
                <label className="label-field">Production Unit *</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.productionUnit}
                  onChange={e => setFormData({ ...formData, productionUnit: e.target.value })}
                  placeholder="e.g. Factory A"
                />
              </div>
              <div>
                <label className="label-field">Production Unit Code *</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.productionUnitCode}
                  onChange={e => setFormData({ ...formData, productionUnitCode: e.target.value })}
                  placeholder="e.g. 0987654321"
                />
              </div>
              <div>
                <label className="label-field">Domestic Source</label>
                <input
                  type="text"
                  className="input-field w-full"
                  value={formData.domesticSource}
                  onChange={e => setFormData({ ...formData, domesticSource: e.target.value })}
                  placeholder="e.g. Shanghai"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDeclaration}
                className="btn-primary flex-1"
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
