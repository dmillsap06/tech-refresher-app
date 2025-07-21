import React, { useState } from 'react';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 transition-colors";

export default function MarkAsShippedModal({ open, onClose, onSave, lineItems, defaultDate, loading }) {
  const [dateShipped, setDateShipped] = useState(defaultDate || new Date().toISOString().substring(0, 10));
  const [tracking, setTracking] = useState('');
  const [notes, setNotes] = useState('');
  const [shippedQuantities, setShippedQuantities] = useState(
    lineItems.map(li => ({
      description: li.description,
      shipped: '', // default blank
      max: Number(li.quantity) - Number(li.shipped || 0) - Number(li.received || li.quantityReceived || 0), // not yet shipped/received
      lineIndex: li.index !== undefined ? li.index : undefined,
      id: li.id,
      category: li.category,
      linkedId: li.linkedId,
      quantity: li.quantity
    }))
  );
  const [touched, setTouched] = useState(false);

  // Handle quantity input for each line item
  function updateShipped(idx, value) {
    setShippedQuantities(arr => arr.map((q, i) => i === idx ? { ...q, shipped: value } : q));
  }

  function handleSave() {
    setTouched(true);
    // Must ship at least one item, all shipped quantities must be 0 or more and not exceed max
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-700 dark:text-indigo-300">Mark as Shipped</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 lg:p-10">
            {/* Form Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-lg font-medium mb-2">Date Shipped <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className={`${inputClass} text-lg h-12`}
                  value={dateShipped}
                  onChange={e => setDateShipped(e.target.value)}
                />
                {touched && !dateShipped && <div className="text-red-600 text-sm mt-1">Date is required.</div>}
              </div>
              
              <div className="space-y-2">
                <label className="block text-lg font-medium mb-2">Tracking Number</label>
                <input
                  type="text"
                  className={`${inputClass} text-lg h-12`}
                  value={tracking}
                  onChange={e => setTracking(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-lg font-medium mb-2">Notes</label>
                <textarea
                  className={`${inputClass} text-lg resize-none`}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Table Section */}
            <div className="border-t pt-6">
              <label className="block text-xl font-medium mb-4">Line Items Shipped</label>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-lg font-semibold text-gray-700 dark:text-gray-200">Description</th>
                      <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-200">Qty Ordered</th>
                      <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-200">Qty Shipped</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {shippedQuantities.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 text-lg text-gray-900 dark:text-gray-100">{item.description}</td>
                        <td className="px-6 py-4 text-center text-lg text-gray-900 dark:text-gray-100">{item.quantity}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <input
                              type="number"
                              className={`${inputClass} text-lg text-center w-24 h-12`}
                              value={item.shipped}
                              min={0}
                              max={item.max !== undefined ? item.max : item.quantity}
                              onChange={e => updateShipped(idx, e.target.value)}
                            />
                            {touched && (Number(item.shipped) > (item.max !== undefined ? item.max : item.quantity) || Number(item.shipped) < 0) && (
                              <div className="text-red-600 text-sm">0 ≤ Qty ≤ {item.max !== undefined ? item.max : item.quantity}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {touched && !shippedQuantities.some(q => Number(q.shipped) > 0) && (
                  <div className="text-red-600 text-sm mt-3">You must ship at least one item.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-6 py-3 text-lg rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              onClick={() => onClose(false)}
              disabled={loading}
            >Cancel</button>
            <button
              type="button"
              className={`px-8 py-3 text-lg rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors ${loading ? 'opacity-60' : ''}`}
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
    </div>
  );
}