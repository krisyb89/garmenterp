// src/app/packing/page.js
// Mobile-first packing interface for warehouse workers
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ALLOWED_ROLES = ['ADMIN', 'PACKING', 'WAREHOUSE', 'PRODUCTION_MANAGER'];
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL'];

export default function PackingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // Main state
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [packType, setPackType] = useState('Prepack');
  const [sizeInputs, setSizeInputs] = useState({});
  const [cartonCount, setCartonCount] = useState(1);
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '', grossWeight: '', netWeight: '' });

  // Packing list state
  const [packingListId, setPackingListId] = useState(null);
  const [addedCartons, setAddedCartons] = useState([]);
  const [saving, setSaving] = useState(false);
  const [finishingPL, setFinishingPL] = useState(false);

  // Auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.user && ALLOWED_ROLES.includes(data.user.role)) {
          setUser(data.user);
        } else {
          setAuthError('Access Denied');
        }
      })
      .catch(e => {
        console.error('Auth error:', e);
        setAuthError('Access Denied');
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // Load POs on mount
  useEffect(() => {
    if (user) loadPOs();
  }, [user]);

  const loadPOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/packing/pos');
      const data = await res.json();
      const filtered = (data.pos || []).filter(po =>
        po.lineItems.some(li => (li.outstandingQty || 0) > 0)
      );
      setPOs(filtered);
    } catch (e) {
      console.error('Error loading POs:', e);
    }
    setLoading(false);
  }, []);

  // When PO selected, load/create packing list
  const handleSelectPO = async (po) => {
    setSelectedPO(po);
    setSelectedLineItem(null);
    setSizeInputs({});
    // Load existing packing list or create new one
    try {
      const res = await fetch('/api/packing-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId: po.id }),
      });
      const pl = await res.json();
      setPackingListId(pl.id);
      setAddedCartons(pl.cartons || []);
    } catch (e) {
      console.error('Error creating packing list:', e);
    }
  };

  // Get valid sizes from selected line item, in correct order
  const getValidSizes = () => {
    if (!selectedLineItem) return [];
    const itemSizes = selectedLineItem.sizeBreakdown || {};
    const validSizes = Object.entries(itemSizes)
      .filter(([_, qty]) => (qty || 0) > 0)
      .map(([sz]) => sz);
    return SIZE_ORDER.filter(sz => validSizes.includes(sz));
  };

  // Calculate total pieces from inputs
  const calculateTotalPcs = () => {
    return Object.values(sizeInputs).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const totalPcs = calculateTotalPcs();

  // Add cartons to packing list
  const handleAddCartons = async () => {
    if (!packingListId || !selectedLineItem || totalPcs === 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/packing-lists/${packingListId}/cartons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleNo: selectedLineItem.style.styleNo,
          color: selectedLineItem.color,
          poLineItemId: selectedLineItem.id,
          packType,
          sizeBreakdown: sizeInputs,
          cartonCount,
          length: parseFloat(dimensions.length) || 0,
          width: parseFloat(dimensions.width) || 0,
          height: parseFloat(dimensions.height) || 0,
          grossWeight: parseFloat(dimensions.grossWeight) || 0,
          netWeight: parseFloat(dimensions.netWeight) || 0,
        }),
      });

      if (res.ok) {
        const cartonData = await res.json();
        setAddedCartons(prev => [...prev, cartonData.carton]);
        // Reset form
        setSelectedLineItem(null);
        setSizeInputs({});
        setPackType('Prepack');
        setCartonCount(1);
        setDimensions({ length: '', width: '', height: '', grossWeight: '', netWeight: '' });
        loadPOs(); // Refresh to update outstanding qty
      }
    } catch (e) {
      console.error('Error adding cartons:', e);
    }
    setSaving(false);
  };

  // Delete carton batch
  const handleDeleteCarton = async (cartonId) => {
    if (!packingListId) return;
    try {
      const res = await fetch(`/api/packing-lists/${packingListId}/cartons?cartonId=${cartonId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAddedCartons(prev => prev.filter(c => c.id !== cartonId));
      }
    } catch (e) {
      console.error('Error deleting carton:', e);
    }
  };

  // Finish packing list
  const handleFinishPackingList = async () => {
    if (!packingListId) return;
    setFinishingPL(true);
    try {
      await fetch(`/api/packing-lists/${packingListId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING_REVIEW' }),
      });
      // Reset everything
      setPackingListId(null);
      setAddedCartons([]);
      setSelectedPO(null);
      setSelectedLineItem(null);
      loadPOs();
    } catch (e) {
      console.error('Error finishing packing list:', e);
    }
    setFinishingPL(false);
  };

  // Calculate running totals
  const totalCartons = addedCartons.reduce((sum, c) => sum + (c.cartonCount || 1), 0);
  const totalAddedPcs = addedCartons.reduce((sum, c) => {
    const breakdown = c.sizeBreakdown || {};
    const pcsPerCtn = Object.values(breakdown).reduce((s, v) => s + (parseInt(v) || 0), 0);
    return sum + (pcsPerCtn * (c.cartonCount || 1));
  }, 0);

  // Auth loading or error
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 font-bold text-xl mb-2">Access Denied</div>
          <div className="text-red-500 text-sm">You do not have permission to access this page.</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const validSizes = getValidSizes();

  return (
    <div className="min-h-screen bg-white pb-36">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-20 flex items-center justify-between">
        <h1 className="font-bold text-xl">Packing</h1>
        <div className="text-sm opacity-90">{user.name}</div>
      </div>

      {/* Main content */}
      <div className="px-4 py-4 space-y-6">
        {/* 1. PO Selector */}
        <section>
          <label className="block label-field text-lg font-bold mb-3">Purchase Order</label>
          <select
            value={selectedPO?.id || ''}
            onChange={(e) => {
              const po = pos.find(p => p.id === e.target.value);
              if (po) handleSelectPO(po);
            }}
            className="w-full select-field text-lg py-3 px-3"
          >
            <option value="">-- Select PO --</option>
            {loading ? (
              <option>Loading...</option>
            ) : pos.length === 0 ? (
              <option>No POs with outstanding qty</option>
            ) : (
              pos.map(po => {
                const totalOut = po.lineItems.reduce((s, li) => s + (li.outstandingQty || 0), 0);
                return (
                  <option key={po.id} value={po.id}>
                    {po.poNo} — {po.customer?.name} ({totalOut} pcs)
                  </option>
                );
              })
            )}
          </select>
        </section>

        {/* 2. Colorway Selector (Line Items) */}
        {selectedPO && (
          <section>
            <label className="block label-field text-lg font-bold mb-3">Style & Color</label>
            <div className="space-y-2">
              {selectedPO.lineItems
                .filter(li => (li.outstandingQty || 0) > 0)
                .map(li => (
                  <button
                    key={li.id}
                    onClick={() => {
                      setSelectedLineItem(li);
                      setSizeInputs({});
                    }}
                    className={`w-full card text-left p-4 border-2 transition ${
                      selectedLineItem?.id === li.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="font-bold text-base">{li.style?.styleNo}</div>
                    <div className="text-base text-gray-700">{li.color}</div>
                    <div className="text-sm text-gray-500 mt-2">
                      Outstanding: {(li.outstandingQty || 0).toLocaleString()} pcs
                    </div>
                  </button>
                ))}
            </div>
          </section>
        )}

        {/* 3. Pack Type Toggle */}
        {selectedLineItem && (
          <section>
            <label className="block label-field text-lg font-bold mb-3">Pack Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['Prepack', 'Single Size', 'Mixed'].map(type => (
                <button
                  key={type}
                  onClick={() => setPackType(type)}
                  className={`py-3 px-2 rounded-lg font-bold text-base border-2 transition ${
                    packType === type
                      ? 'btn-primary border-blue-600'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 4. Size Ratio Section */}
        {selectedLineItem && validSizes.length > 0 && (
          <section>
            <label className="block label-field text-lg font-bold mb-3">
              Pieces per Size per Carton
            </label>
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {validSizes.map(size => {
                const itemQty = selectedLineItem.sizeBreakdown?.[size] || 0;
                return (
                  <div key={size} className="flex items-center gap-3">
                    <label className="w-16 font-bold text-base">{size}</label>
                    <input
                      type="number"
                      min="0"
                      value={sizeInputs[size] || ''}
                      onChange={(e) =>
                        setSizeInputs(prev => ({
                          ...prev,
                          [size]: e.target.value,
                        }))
                      }
                      className="input-field flex-1 text-lg py-2"
                      placeholder="0"
                    />
                  </div>
                );
              })}
              <div className="bg-white rounded-lg p-3 mt-3 border border-gray-200">
                <div className="text-sm text-gray-600">Total per carton:</div>
                <div className="text-2xl font-bold text-blue-600">{totalPcs} pcs</div>
              </div>
            </div>
          </section>
        )}

        {/* 5. Carton Details */}
        {selectedLineItem && (
          <section>
            <label className="block label-field text-lg font-bold mb-3">Carton Details</label>
            <div className="space-y-3">
              {/* Number of identical cartons */}
              <div>
                <label className="block text-base font-semibold mb-1">Number of Identical Cartons</label>
                <input
                  type="number"
                  min="1"
                  value={cartonCount}
                  onChange={(e) => setCartonCount(parseInt(e.target.value) || 1)}
                  className="input-field w-full text-lg py-3"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-base font-semibold mb-2">Dimensions (L×W×H cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={dimensions.length}
                    onChange={(e) => setDimensions(p => ({ ...p, length: e.target.value }))}
                    placeholder="L"
                    className="input-field text-lg py-2 text-center"
                  />
                  <input
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => setDimensions(p => ({ ...p, width: e.target.value }))}
                    placeholder="W"
                    className="input-field text-lg py-2 text-center"
                  />
                  <input
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => setDimensions(p => ({ ...p, height: e.target.value }))}
                    placeholder="H"
                    className="input-field text-lg py-2 text-center"
                  />
                </div>
              </div>

              {/* Weights */}
              <div>
                <label className="block text-base font-semibold mb-2">Weight (kg)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Gross</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.grossWeight}
                      onChange={(e) => setDimensions(p => ({ ...p, grossWeight: e.target.value }))}
                      className="input-field w-full text-lg py-2"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Net</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.netWeight}
                      onChange={(e) => setDimensions(p => ({ ...p, netWeight: e.target.value }))}
                      className="input-field w-full text-lg py-2"
                      placeholder="0.0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 6. Add to Packing List Button */}
        {selectedLineItem && totalPcs > 0 && packingListId && (
          <button
            onClick={handleAddCartons}
            disabled={saving}
            className="w-full btn-success py-4 px-4 text-lg font-bold rounded-lg disabled:opacity-50 active:scale-95 transition"
          >
            {saving ? 'Adding...' : `Add to Packing List (${totalPcs} pcs × ${cartonCount} ctns)`}
          </button>
        )}

        {/* 7. Cartons Added Section */}
        {addedCartons.length > 0 && (
          <section>
            <h2 className="label-field text-lg font-bold mb-3">Cartons Added</h2>
            <div className="space-y-3">
              {addedCartons.map((carton, idx) => {
                const breakdown = carton.sizeBreakdown || {};
                const pcsPerCtn = Object.values(breakdown).reduce((s, v) => s + (parseInt(v) || 0), 0);
                const totalCartonPcs = pcsPerCtn * (carton.cartonCount || 1);
                return (
                  <div key={idx} className="card border border-gray-200 p-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-base">
                        {carton.styleNo} - {carton.color}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {carton.cartonCount || 1} × {pcsPerCtn} pcs/ctn = {totalCartonPcs.toLocaleString()} pcs
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        GW: {carton.grossWeight || 0}kg | NW: {carton.netWeight || 0}kg
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCarton(carton.id)}
                      className="btn-danger py-2 px-3 text-white font-bold rounded ml-2 active:scale-95 transition"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* 8. Sticky Bottom Bar */}
      {packingListId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-base font-semibold text-gray-700">
                {totalCartons} cartons | {totalAddedPcs.toLocaleString()} pcs
              </div>
              <button
                onClick={handleFinishPackingList}
                disabled={finishingPL}
                className="btn-primary py-2 px-4 text-white font-bold rounded text-base disabled:opacity-50 active:scale-95 transition"
              >
                {finishingPL ? 'Finishing...' : 'Finish Packing List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
