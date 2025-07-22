//Comment
import React, { useState } from 'react';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 sm:px-3 py-1 sm:py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base";

export default function MarkAsShippedModal({ open, onClose, onSave, lineItems, defaultDate, loading }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-4 my-4 relative flex flex-col max-h-[95vh]">
        {/* Header */}
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 sm:mb-6 text-indigo-700 dark:text-indigo-300">Mark as Shipped</h2>
        
        {/* Fields */}
        <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Date Shipped <span className="text-red-500">*</span></label>
            <input
              type="date"
              className={inputClass}
              value={dateShipped}
              onChange={e => setDateShipped(e.target.value)}
            />
            {touched && !dateShipped && <div className="text-red-600 text-xs mt-1">Date is required.</div>}
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Tracking Number</label>
            <input
              type="text"
              className={inputClass}
              value={tracking}
              onChange={e => setTracking(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-sm sm:text-base">Notes</label>
            <textarea
              className={inputClass}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional"
            />
          </div>
        </div>
        
        {/* Table area - make flex-1 and scrollable */}
        <div className="flex-1 min-h-0 border-t pt-4 sm:pt-6 overflow-auto">
          <label className="block font-medium mb-3 sm:mb-4 text-sm sm:text-base lg:text-lg">Line Items Shipped</label>
          <div>
            <table className="min-w-full text-xs sm:text-sm lg:text-base border-collapse">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold">Description</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold min-w-[100px]">Qty Ordered</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold min-w-[120px]">Qty Shipped</th>
                </tr>
              </thead>
              <tbody>
                {shippedQuantities.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3">{item.description}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-2 sm:px-4 py-2 sm:py-3 text-center">
                      <input
                        type="number"
                        className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full max-w-[100px] mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-center"
                        value={item.shipped}
                        min={0}
                        max={item.max !== undefined ? item.max : item.quantity}
                        onChange={e => updateShipped(idx, e.target.value)}
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
            <div className="text-red-600 text-xs sm:text-sm mt-2 font-medium">You must ship at least one item.</div>
          )}
        </div>
        
        {/* Action buttons always visible */}
        <div className="flex-shrink-0 flex justify-end gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t bg-white dark:bg-gray-800">
          <button
            type="button"
            className="px-4 sm:px-6 py-2 sm:py-3 rounded text-sm sm:text-base bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 font-medium"
            onClick={() => onClose(false)}
            disabled={loading}
          >Cancel</button>
          <button
            type="button"
            className={`px-5 sm:px-8 py-2 sm:py-3 rounded text-sm sm:text-base bg-indigo-600 text-white font-semibold hover:bg-indigo-700 ${loading ? 'opacity-60' : ''}`}
            disabled={loading || !dateShipped || !shippedQuantities.some(q => Number(q.shipped) > 0) ||
              shippedQuantities.some(q =>
                isNaN(Number(q.shipped)) ||
                Number(q.shipped) < 0 ||
                Number(q.shipped) > (q.max !== undefined ? q.max : q.quantity)
              )
            }
            onClick={handleSave}
          >{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}