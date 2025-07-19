import React, { useState } from 'react';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg relative">
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Mark as Shipped</h2>
        <div className="mb-3">
          <label className="block font-medium mb-1">Date Shipped <span className="text-red-500">*</span></label>
          <input
            type="date"
            className={inputClass}
            value={dateShipped}
            onChange={e => setDateShipped(e.target.value)}
          />
          {touched && !dateShipped && <div className="text-red-600 text-xs mt-1">Date is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Tracking Number</label>
          <input
            type="text"
            className={inputClass}
            value={tracking}
            onChange={e => setTracking(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Notes</label>
          <textarea
            className={inputClass}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
          />
        </div>
        <div className="mb-3 border-t pt-3">
          <label className="block font-medium mb-2">Line Items Shipped</label>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1">Description</th>
                <th className="px-2 py-1 text-center">Qty Ordered</th>
                <th className="px-2 py-1 text-center">Qty Shipped</th>
              </tr>
            </thead>
            <tbody>
              {shippedQuantities.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1">{item.description}</td>
                  <td className="px-2 py-1 text-center">{item.quantity}</td>
                  <td className="px-2 py-1 text-center w-24">
                    <input
                      type="number"
                      className={inputClass}
                      value={item.shipped}
                      min={0}
                      max={item.max !== undefined ? item.max : item.quantity}
                      onChange={e => updateShipped(idx, e.target.value)}
                    />
                    {touched && (Number(item.shipped) > (item.max !== undefined ? item.max : item.quantity) || Number(item.shipped) < 0) && (
                      <div className="text-red-600 text-xs mt-1">0 &le; Qty &le; {item.max !== undefined ? item.max : item.quantity}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {touched && !shippedQuantities.some(q => Number(q.shipped) > 0) && (
            <div className="text-red-600 text-xs mt-1">You must ship at least one item.</div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
            onClick={() => onClose(false)}
            disabled={loading}
          >Cancel</button>
          <button
            type="button"
            className={`px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 ${loading ? 'opacity-60' : ''}`}
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