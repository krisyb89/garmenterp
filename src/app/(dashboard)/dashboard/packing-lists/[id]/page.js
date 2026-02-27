'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';

const formatCurrency = (value) => {
  if (!value && value !== 0) return '-';
  return parseFloat(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export default function PackingListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingExFtyDate, setEditingExFtyDate] = useState(false);
  const [exFtyDateValue, setExFtyDateValue] = useState('');
  const [assigningShipment, setAssigningShipment] = useState(false);
  const [availableShipments, setAvailableShipments] = useState([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  useEffect(() => {
    const loadPackingList = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/packing-lists/${id}`);
        if (!response.ok) {
          throw new Error('Failed to load packing list');
        }
        const data = await response.json();
        setPackingList(data);
        setExFtyDateValue(formatDateForInput(data.exFtyDate));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPackingList();
    }
  }, [id]);

  const loadAvailableShipments = async () => {
    try {
      setLoadingShipments(true);
      const response = await fetch('/api/shipments');
      if (response.ok) {
        const data = await response.json();
        setAvailableShipments(data.shipments || []);
      }
    } catch (err) {
      console.error('Failed to load shipments:', err);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleExFtyDateEdit = async () => {
    if (!exFtyDateValue) {
      setEditingExFtyDate(false);
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/packing-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exFtyDate: exFtyDateValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ex-factory date');
      }

      const updatedData = await response.json();
      setPackingList(updatedData);
      setEditingExFtyDate(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlinkShipment = async () => {
    if (!window.confirm('Are you sure you want to unlink this packing list from the shipment?')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/packing-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to unlink shipment');
      }

      const updatedData = await response.json();
      setPackingList(updatedData);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignShipment = async (shipmentId) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/packing-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign shipment');
      }

      const updatedData = await response.json();
      setPackingList(updatedData);
      setAssigningShipment(false);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/packing-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update packing list status');
      }

      const updatedData = await response.json();
      setPackingList(updatedData);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this packing list? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/packing-lists/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete packing list');
      }

      router.push('/dashboard/packing-lists');
    } catch (err) {
      alert(`Error: ${err.message}`);
      setActionLoading(false);
    }
  };

  const getGroupedCartonSummary = () => {
    if (!packingList?.cartons) return [];

    const grouped = {};
    packingList.cartons.forEach((carton) => {
      const key = `${carton.styleNo}|${carton.color}|${carton.dcName}`;
      if (!grouped[key]) {
        grouped[key] = {
          styleNo: carton.styleNo,
          color: carton.color,
          dcName: carton.dcName,
          totalPcs: 0,
          totalGW: 0,
          totalNW: 0,
          totalCBM: 0,
          cartonCount: 0,
        };
      }
      grouped[key].totalPcs += carton.totalPcs || 0;
      grouped[key].totalGW += parseFloat(carton.grossWeight || 0);
      grouped[key].totalNW += parseFloat(carton.netWeight || 0);
      grouped[key].totalCBM += parseFloat(carton.cbm || 0);
      grouped[key].cartonCount += 1;
    });

    return Object.values(grouped);
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ padding: '2rem', color: '#d32f2f' }}>Error: {error}</div>
      </div>
    );
  }

  if (!packingList) {
    return (
      <div className="card">
        <div style={{ padding: '2rem' }}>Packing list not found</div>
      </div>
    );
  }

  const canSubmitForReview = packingList.status === 'IN_PROGRESS';
  const canApproveOrReject = packingList.status === 'PENDING_REVIEW';
  const canReopen = packingList.status === 'REJECTED';

  return (
    <div>
      {/* Header Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <Link href="/dashboard/packing-lists" className="text-sm text-blue-600 mb-2 inline-block">← Packing Lists</Link>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem' }}>
                Packing List: {packingList.packingListNo}
              </h1>
              <p style={{ margin: '0.25rem 0', color: '#666' }}>
                PO:{' '}
                <Link href={`/dashboard/purchase-orders/${packingList.poId}`} style={{ color: '#1976d2' }}>
                  {packingList.po?.poNo}
                </Link>
              </p>
              <p style={{ margin: '0.25rem 0', color: '#666' }}>
                Customer: {packingList.po?.customer?.name}
              </p>
              <p style={{ margin: '0.25rem 0', color: '#666' }}>
                Ex-Factory:{' '}
                {editingExFtyDate ? (
                  <input
                    type="date"
                    value={exFtyDateValue}
                    onChange={(e) => setExFtyDateValue(e.target.value)}
                    onBlur={handleExFtyDateEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleExFtyDateEdit();
                      }
                    }}
                    autoFocus
                    disabled={actionLoading}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #1976d2',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingExFtyDate(true)}
                    style={{
                      cursor: 'pointer',
                      color: packingList.exFtyDate ? '#1976d2' : '#999',
                      textDecoration: 'underline',
                    }}
                  >
                    {packingList.exFtyDate ? formatDate(packingList.exFtyDate) : 'Not set'}
                  </span>
                )}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={packingList.status} style={{ marginBottom: '0.5rem' }} />
            </div>
          </div>

          {/* Totals Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ borderLeft: '4px solid #1976d2', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Cartons</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{packingList.totalCartons || 0}</div>
            </div>
            <div style={{ borderLeft: '4px solid #1976d2', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Total Qty</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{(packingList.totalQty || 0).toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '4px solid #1976d2', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Gross Weight (kg)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                {formatCurrency(packingList.totalGrossWeight)}
              </div>
            </div>
            <div style={{ borderLeft: '4px solid #1976d2', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Net Weight (kg)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                {formatCurrency(packingList.totalNetWeight)}
              </div>
            </div>
            <div style={{ borderLeft: '4px solid #1976d2', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#666' }}>Total CBM</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{formatCurrency(packingList.totalCBM)}</div>
            </div>
          </div>

          {/* Notes */}
          {packingList.notes && (
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>Notes:</strong> {packingList.notes}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canSubmitForReview && (
              <button
                className="btn-primary"
                onClick={() => handleStatusChange('PENDING_REVIEW')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}

            {canApproveOrReject && (
              <>
                <button
                  className="btn-success"
                  onClick={() => handleStatusChange('APPROVED')}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Approve'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleStatusChange('REJECTED')}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Reject'}
                </button>
              </>
            )}

            {canReopen && (
              <button
                className="btn-secondary"
                onClick={() => handleStatusChange('IN_PROGRESS')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Reopening...' : 'Reopen'}
              </button>
            )}

            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={actionLoading}
              style={{ marginLeft: 'auto' }}
            >
              {actionLoading ? 'Deleting...' : 'Delete Packing List'}
            </button>
          </div>
        </div>
      </div>

      {/* Shipment Linking Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Shipment Assignment</h2>
          {packingList.shipmentId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0', color: '#666', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Assigned to Shipment
                </p>
                <Link
                  href={`/dashboard/shipments/${packingList.shipmentId}`}
                  style={{
                    color: '#1976d2',
                    textDecoration: 'underline',
                    fontSize: '1rem',
                    fontWeight: '500',
                  }}
                >
                  {packingList.shipment?.shipmentNo || `SHP-${packingList.shipmentId}`}
                </Link>
                {packingList.shipment?.status && (
                  <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.875rem' }}>
                    Status: <StatusBadge status={packingList.shipment.status} />
                  </p>
                )}
              </div>
              <button
                className="btn-secondary"
                onClick={handleUnlinkShipment}
                disabled={actionLoading}
                style={{ whiteSpace: 'nowrap' }}
              >
                {actionLoading ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 1rem 0', color: '#666' }}>Not assigned to a shipment</p>
              {assigningShipment ? (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
                    Select a Shipment
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignShipment(e.target.value);
                        }
                      }}
                      disabled={loadingShipments || actionLoading}
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        flex: 1,
                      }}
                      defaultValue=""
                    >
                      <option value="">
                        {loadingShipments ? 'Loading shipments...' : 'Select a shipment...'}
                      </option>
                      {availableShipments.map((shipment) => (
                        <option key={shipment.id} value={shipment.id}>
                          {shipment.shipmentNo} - {shipment.po?.customer?.name || 'N/A'}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-secondary"
                      onClick={() => setAssigningShipment(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setAssigningShipment(true);
                    loadAvailableShipments();
                  }}
                  disabled={actionLoading}
                >
                  Assign to Shipment
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Carton Details Table — consolidated identical cartons into ranges */}
      <div className="card" style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Carton Details</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Ctn#</th>
                <th>Ctns</th>
                <th>Style</th>
                <th>Color</th>
                <th>DC</th>
                <th>Pack Type</th>
                <th>Size Breakdown</th>
                <th style={{ textAlign: 'right' }}>Pcs/Ctn</th>
                <th style={{ textAlign: 'right' }}>Total Pcs</th>
                <th style={{ textAlign: 'right' }}>GW/Ctn (kg)</th>
                <th>Dimensions (L×W×H)</th>
                <th style={{ textAlign: 'right' }}>CBM/Ctn</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                if (!packingList.cartons || packingList.cartons.length === 0) {
                  return (
                    <tr>
                      <td colSpan="12" style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                        No cartons found
                      </td>
                    </tr>
                  );
                }

                // Group consecutive identical cartons into ranges
                const consolidated = [];
                const cartons = [...packingList.cartons].sort((a, b) => a.cartonNo - b.cartonNo);

                for (const carton of cartons) {
                  const sizeKey = JSON.stringify(carton.sizeBreakdown || {});
                  const last = consolidated[consolidated.length - 1];

                  const isSame = last &&
                    last.styleNo === carton.styleNo &&
                    last.color === carton.color &&
                    last.dcName === carton.dcName &&
                    last.packType === carton.packType &&
                    last._sizeKey === sizeKey &&
                    last.totalPcs === carton.totalPcs &&
                    Number(last.grossWeight) === Number(carton.grossWeight) &&
                    Number(last.length || 0) === Number(carton.length || 0) &&
                    Number(last.width || 0) === Number(carton.width || 0) &&
                    Number(last.height || 0) === Number(carton.height || 0);

                  if (isSame) {
                    last.endCartonNo = carton.cartonNo;
                    last.count += 1;
                  } else {
                    consolidated.push({
                      ...carton,
                      startCartonNo: carton.cartonNo,
                      endCartonNo: carton.cartonNo,
                      count: 1,
                      _sizeKey: sizeKey,
                    });
                  }
                }

                return consolidated.map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-medium" style={{ whiteSpace: 'nowrap' }}>
                      {row.startCartonNo === row.endCartonNo
                        ? row.startCartonNo
                        : `${row.startCartonNo} - ${row.endCartonNo}`}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: row.count > 1 ? '#dbeafe' : '#f3f4f6',
                        color: row.count > 1 ? '#1e40af' : '#6b7280',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}>
                        ×{row.count}
                      </span>
                    </td>
                    <td>{row.styleNo}</td>
                    <td>{row.color}</td>
                    <td>{row.dcName || '-'}</td>
                    <td>{row.packType}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {row.sizeBreakdown && Object.keys(row.sizeBreakdown).length > 0 ? (
                        <div>
                          {sortSizeEntries(Object.entries(row.sizeBreakdown))
                            .map(([size, qty]) => `${size}: ${qty}`)
                            .join(', ')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{(row.totalPcs || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600' }}>
                      {((row.totalPcs || 0) * row.count).toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.grossWeight)}</td>
                    <td>
                      {row.length && row.width && row.height
                        ? `${row.length} × ${row.width} × ${row.height} cm`
                        : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.cbm)}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary by Style/Color/DC */}
      <div className="card">
        <div style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Summary by Style/Color/DC</h2>
          <table className="table-base">
            <thead>
              <tr>
                <th>Style</th>
                <th>Color</th>
                <th>DC</th>
                <th style={{ textAlign: 'right' }}>Carton Count</th>
                <th style={{ textAlign: 'right' }}>Total Pcs</th>
                <th style={{ textAlign: 'right' }}>Total GW (kg)</th>
                <th style={{ textAlign: 'right' }}>Total NW (kg)</th>
                <th style={{ textAlign: 'right' }}>Total CBM</th>
              </tr>
            </thead>
            <tbody>
              {getGroupedCartonSummary().length > 0 ? (
                getGroupedCartonSummary().map((summary, idx) => (
                  <tr key={idx}>
                    <td>{summary.styleNo}</td>
                    <td>{summary.color}</td>
                    <td>{summary.dcName}</td>
                    <td style={{ textAlign: 'right' }}>{summary.cartonCount}</td>
                    <td style={{ textAlign: 'right' }}>{(summary.totalPcs || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(summary.totalGW).toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(summary.totalNW).toFixed(1)}</td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(summary.totalCBM).toFixed(4)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
                    No summary data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
