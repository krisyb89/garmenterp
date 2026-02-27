// src/components/ShippingOrdersEditor.js
// DC-level split editor for a single PO line item.
// Props:
//   sizes            string[]   — ordered size keys from the line item
//   lineSizeBreakdown object    — { [size]: qty } master targets for this line
//   shippingOrders   SO[]       — current list (each has _id, soNo, dc, address, sizeBreakdown)
//   onChange(SOs)               — called whenever the list changes

'use client';

export function newSO(sizes) {
  return {
    _id:          Math.random().toString(36).slice(2),
    soNo:         '',
    dc:           '',
    address:      '',
    sizeBreakdown: Object.fromEntries(sizes.map(s => [s, ''])),
  };
}

export default function ShippingOrdersEditor({ sizes, lineSizeBreakdown, shippingOrders = [], onChange }) {

  function addSO() {
    onChange([...shippingOrders, newSO(sizes)]);
  }

  function removeSO(soId) {
    onChange(shippingOrders.filter(so => so._id !== soId));
  }

  function updateSO(soId, field, value) {
    onChange(shippingOrders.map(so => so._id === soId ? { ...so, [field]: value } : so));
  }

  function updateSOSize(soId, size, value) {
    onChange(shippingOrders.map(so =>
      so._id === soId
        ? { ...so, sizeBreakdown: { ...so.sizeBreakdown, [size]: value } }
        : so
    ));
  }

  // Per-size allocated totals across all SOs
  const allocated = Object.fromEntries(
    sizes.map(s => [s, shippingOrders.reduce((sum, so) => sum + (parseInt(so.sizeBreakdown?.[s]) || 0), 0)])
  );
  const allocatedTotal = Object.values(allocated).reduce((s, v) => s + v, 0);
  const lineTotal      = sizes.reduce((s, sz) => s + (parseInt(lineSizeBreakdown[sz]) || 0), 0);

  return (
    <div className="mt-4 border-t border-dashed border-gray-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Shipping Orders — DC Splits
        </span>
        <button
          type="button"
          onClick={addSO}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-50"
        >
          + Add DC
        </button>
      </div>

      {shippingOrders.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-1">
          No DC splits — all qty ships as one. Click "+ Add DC" to split by distribution center.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-gray-500 font-medium px-2 py-2 border-r border-gray-200 w-28">SO #</th>
                <th className="text-left text-gray-500 font-medium px-2 py-2 border-r border-gray-200 w-36">DC / Destination</th>
                {sizes.map(size => (
                  <th key={size} className="text-center text-gray-500 font-medium px-1 py-2 border-r border-gray-200 w-16">{size}</th>
                ))}
                <th className="text-center text-gray-500 font-medium px-2 py-2 border-r border-gray-200 w-16">Total</th>
                <th className="w-7 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {shippingOrders.map((so, rowIdx) => {
                const soTotal = sizes.reduce((s, sz) => s + (parseInt(so.sizeBreakdown?.[sz]) || 0), 0);
                return (
                  <tr key={so._id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="border-r border-b border-gray-200 p-0.5">
                      <input
                        type="text"
                        className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded"
                        placeholder="SO-001"
                        value={so.soNo}
                        onChange={e => updateSO(so._id, 'soNo', e.target.value)}
                      />
                    </td>
                    <td className="border-r border-b border-gray-200 p-0.5">
                      <input
                        type="text"
                        className="w-full px-1.5 py-1 text-xs bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-300 rounded"
                        placeholder="e.g. East DC"
                        value={so.dc}
                        onChange={e => updateSO(so._id, 'dc', e.target.value)}
                      />
                    </td>
                    {sizes.map(size => {
                      const isOver = allocated[size] > (parseInt(lineSizeBreakdown[size]) || 0);
                      return (
                        <td key={size} className="border-r border-b border-gray-200 p-0.5">
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-0.5 py-1 text-xs text-center bg-transparent focus:outline-none focus:ring-1 rounded
                              ${isOver ? 'focus:ring-red-400 text-red-600' : 'focus:ring-blue-300'}`}
                            placeholder="0"
                            value={so.sizeBreakdown?.[size] ?? ''}
                            onChange={e => updateSOSize(so._id, size, e.target.value)}
                          />
                        </td>
                      );
                    })}
                    <td className="border-r border-b border-gray-200 text-center font-semibold text-blue-700 px-1">
                      {soTotal.toLocaleString()}
                    </td>
                    <td className="border-b border-gray-200 text-center">
                      <button
                        type="button"
                        onClick={() => removeSO(so._id)}
                        className="text-red-300 hover:text-red-500 font-bold px-1"
                      >×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              {/* Allocated */}
              <tr className="bg-gray-100">
                <td colSpan={2} className="border-r border-gray-200 px-2 py-1.5 text-gray-500 font-semibold">Allocated</td>
                {sizes.map(size => {
                  const alloc  = allocated[size] || 0;
                  const target = parseInt(lineSizeBreakdown[size]) || 0;
                  const state  = alloc > target ? 'over' : alloc === target ? 'full' : 'under';
                  return (
                    <td key={size} className={`border-r border-gray-200 text-center py-1.5 font-semibold
                      ${state === 'over' ? 'text-red-600 bg-red-50' : state === 'full' ? 'text-green-700' : 'text-amber-600'}`}>
                      {alloc}
                    </td>
                  );
                })}
                <td className={`border-r border-gray-200 text-center py-1.5 font-semibold
                  ${allocatedTotal > lineTotal ? 'text-red-600' : allocatedTotal === lineTotal ? 'text-green-700' : 'text-amber-600'}`}>
                  {allocatedTotal}
                </td>
                <td></td>
              </tr>
              {/* Line total */}
              <tr className="bg-gray-50">
                <td colSpan={2} className="border-r border-gray-200 px-2 py-1 text-gray-400 text-xs">PO Line Total</td>
                {sizes.map(size => (
                  <td key={size} className="border-r border-gray-200 text-center text-gray-400 py-1">
                    {parseInt(lineSizeBreakdown[size]) || 0}
                  </td>
                ))}
                <td className="border-r border-gray-200 text-center text-gray-400 py-1">{lineTotal}</td>
                <td></td>
              </tr>
              {/* Unallocated */}
              <tr className="bg-gray-50">
                <td colSpan={2} className="border-r border-gray-200 px-2 py-1 text-gray-400 text-xs">Unallocated</td>
                {sizes.map(size => {
                  const unalloc = (parseInt(lineSizeBreakdown[size]) || 0) - (allocated[size] || 0);
                  return (
                    <td key={size} className={`border-r border-gray-200 text-center py-1 font-medium text-xs
                      ${unalloc < 0 ? 'text-red-600' : unalloc === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {unalloc}
                    </td>
                  );
                })}
                <td className={`border-r border-gray-200 text-center py-1 font-medium text-xs
                  ${lineTotal - allocatedTotal < 0 ? 'text-red-600' : lineTotal - allocatedTotal === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {lineTotal - allocatedTotal}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
