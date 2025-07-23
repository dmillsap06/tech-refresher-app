import React, { useState } from 'react';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 sm:px-3 py-1 sm:py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base";

export default function MarkAsShippedModal({ open, onClose, onSave, lineItems, defaultDate, loading }) {
  // --- STATE AND LOGIC (Unchanged) ---
  const [dateShipped, setDateShipped] = useState(defaultDate || new Date().toISOString().substring(0, 10));
  const [tracking, setTracking] = useState('');
  const [notes, setNotes] = useState('');
  const [shippedQuantities, setShippedQuantities] = useState(
    lineItems.map(li => ({
      description: li.description,
      shipped: '',
      max: Number(li.quantity) - Number(li.shipped || 0) - Number(li.received || li.quantityReceived || 0),
      lineIndex: li.index !== undefined ? li.index : undefined,
      id: li.id,
      category: li.category,
      linkedId: li.linkedId,
      quantity: li.quantity
    }))
  );
  const [touched, setTouched] = useState(false);

  function updateShipped(idx, value) {
    setShippedQuantities(arr => arr.map((q, i) => i === idx ? { ...q, shipped: value } : q));
  }

  function handleSave() {
    setTouched(true);
    const valid = shippedQuantities.some(q => Number(q.shipped) > 0)
      && shippedQuantities.every(q =>
        !isNaN(Number(q.shipped)) &&
        Number(q.shipped) >= 0 &&
        Number(q.shipped) <= (q.max !== undefined ? q.max : q.quantity)
      );
    if (!dateShipped || !valid) return;
    onSave({
      dateShipped,
      tracking,
      notes,
      shippedLineItems: shippedQuantities.map((q, idx) => ({
        index: idx,
        description: q.description,
        shipped: Number(q.shipped) || 0,
        lineIndex: q.lineIndex,
        id: q.id,
        category: q.category,
        linkedId: q.linkedId,
        quantity: q.quantity
      }))
    });
  }

  if (!open) return null;

  // --- DEFINITIVE JSX STRUCTURE ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      {/* Modal container with fixed height and flex layout */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-7xl flex flex-col" style={{ height: '90vh', maxHeight: '90vh' }}>
        
        {/* Non-shrinking header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Mark as Shipped</h2>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: '0px' }}>
          {/* Input Fields */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block font-medium mb-1">Date Shipped <span className="text-red-500">*</span></label>
              <input type="date" className={inputClass} value={dateShipped} onChange={e => setDateShipped(e.target.value)} />
              {touched && !dateShipped && <div className="text-red-600 text-xs mt-1">Date is required.</div>}
            </div>
            <div>
              <label className="block font-medium mb-1">Tracking Number</label>
              <input type="text" className={inputClass} value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="block font-medium mb-1">Notes</label>
              <textarea className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional" />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block font-medium mb-4 text-lg">Line Items Shipped</label>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">Description</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold w-32">Qty Ordered</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold w-40">Qty Shipped</th>
                  </tr>
                </thead>
                <tbody>
                  {shippedQuantities.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{item.description}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                        <input
                          type="number"
                          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-center"
                          value={item.shipped}
                          min={0}
                          max={item.max !== undefined ? item.max : item.quantity}
                          onChange={e => updateShipped(idx, e.target.value)}
                          placeholder="0"
                        />
                        {touched && (Number(item.shipped) > (item.max !== undefined ? item.max : item.quantity) || Number(item.shipped) < 0) && (
                          <div className="text-red-600 text-xs mt-1">0 ≤ Qty ≤ {item.max !== undefined ? item.max : item.quantity}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {touched && !shippedQuantities.some(q => Number(q.shipped) > 0) && (
              <div className="text-red-600 text-sm mt-2 font-medium">You must ship at least one item.</div>
            )}
          </div>
        </div>

        {/* Non-shrinking footer */}
        <div className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className="px-6 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 font-medium"
            onClick={() => onClose(false)}
            disabled={loading}
          >Cancel</button>
          <button
            type="button"
            className={`px-8 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 ${loading || !dateShipped || !shippedQuantities.some(q => Number(q.shipped) > 0) || shippedQuantities.some(q => isNaN(Number(q.shipped)) || Number(q.shipped) < 0 || Number(q.shipped) > (q.max !== undefined ? q.max : q.quantity)) ? 'opacity-60' : ''}`}
            disabled={loading || !dateShipped || !shippedQuantities.some(q => Number(q.shipped) > 0) || shippedQuantities.some(q => isNaN(Number(q.shipped)) || Number(q.shipped) < 0 || Number(q.shipped) > (q.max !== undefined ? q.max : q.quantity))}
            onClick={handleSave}
          >{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}