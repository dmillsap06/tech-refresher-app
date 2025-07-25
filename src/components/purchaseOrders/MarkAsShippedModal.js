import React, { useState, useRef, useEffect } from 'react';
import useShippingCarriers from './useShippingCarriers';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 sm:px-3 py-1 sm:py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base";

export default function MarkAsShippedModal({
  open,
  onClose,
  onSave,
  lineItems,
  defaultDate,
  loading,
  groupId,
  refreshParent, // New prop to explicitly refresh parent
  showNotification
}) {
  const { carriers, loading: carriersLoading } = useShippingCarriers(groupId);
  const [step, setStep] = useState('ask-shipment-type');
  const [shipAll, setShipAll] = useState(true);
  const [dateShipped, setDateShipped] = useState(defaultDate || new Date().toISOString().substring(0, 10));
  const [carrierId, setCarrierId] = useState('');
  const [tracking, setTracking] = useState('');
  const [notes, setNotes] = useState('');
  const [shippedQuantities, setShippedQuantities] = useState([]);
  const [touched, setTouched] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const errorReported = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setDateShipped(defaultDate || new Date().toISOString().substring(0, 10));
      setCarrierId('');
      setTracking('');
      setNotes('');
      setTouched(false);
      setStep('ask-shipment-type');
      errorReported.current = false;
      setLocalLoading(false);
      
      // Initialize shipped quantities from lineItems
      setShippedQuantities(
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
    }
  }, [open, lineItems, defaultDate]);

  function updateShipped(idx, value) {
    setShippedQuantities(arr => arr.map((q, i) => i === idx ? { ...q, shipped: value } : q));
  }

  // Fixed handleSave function - use async/await and don't pass callback
  async function handleSave() {
    setTouched(true);
    const valid = shippedQuantities.some(q => Number(q.shipped) > 0)
      && shippedQuantities.every(q =>
        !isNaN(Number(q.shipped)) &&
        Number(q.shipped) >= 0 &&
        Number(q.shipped) <= (q.max !== undefined ? q.max : q.quantity)
      );
    if (!dateShipped || !carrierId || !tracking || !valid) return;

    setLocalLoading(true);
    const carrierObj = carriers.find(c => c.id === carrierId);

    try {
      // Prepare shipping data
      const shippingData = {
        dateShipped,
        carrier: carrierObj ? { id: carrierObj.id, name: carrierObj.name } : null,
        tracking,
        notes,
        shippedLineItems: shippedQuantities.map((q, idx) => ({
          index: idx,
          description: q.description || "Unnamed item",
          shipped: Number(q.shipped) || 0,
          lineIndex: typeof q.lineIndex === 'number' ? q.lineIndex : null,
          id: q.id || null,
          category: q.category || null,
          linkedId: q.linkedId || null,
          quantity: Number(q.quantity) || 0
        }))
      };

      // FIXED: Call onSave with just the data, no callback parameter
      const result = await onSave(shippingData);
      
      // Use the result to determine if the save was successful
      if (result) {
        if (typeof showNotification === 'function') {
          showNotification('Shipment recorded successfully!', 'success');
        }
        
        // After successful save, refresh the parent if needed
        if (typeof refreshParent === 'function') {
          await refreshParent();
        }
        
        // Close the modal after successful save
        onClose(true);
      } else {
        if (typeof showNotification === 'function') {
          showNotification('There may have been an issue recording the shipment.', 'warning');
        }
      }
    } catch (err) {
      if (!errorReported.current) {
        console.error('MarkAsShippedModal-Save', err);
        if (typeof showNotification === 'function') {
          showNotification(`Error recording shipment: ${err.message || 'Unknown error'}`, 'error');
        }
        errorReported.current = true;
      }
    } finally {
      setLocalLoading(false);
    }
  }

  if (!open) return null;

  // Use either the prop loading state or our local loading state
  const isLoading = loading || localLoading;

  // Step 1: Ask if this is a full or partial shipment
  if (step === 'ask-shipment-type') {
    const canFullyShip = shippedQuantities.every(item => item.max > 0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-lg relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xl">&times;</button>
          <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Mark as Shipped</h2>
          <p className="mb-6 text-gray-800 dark:text-gray-200">Would you like to ship the entire order, or only some items?</p>
          <div className="flex flex-col gap-3">
            <button
              className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-70"
              onClick={() => {
                setShipAll(true);
                setStep('enter-details');
                setShippedQuantities(shippedQuantities.map(item => ({
                  ...item,
                  shipped: item.max
                })));
              }}
              disabled={!canFullyShip}
            >
              Ship All Items
            </button>
            <button
              className="px-5 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
              onClick={() => {
                setShipAll(false);
                setStep('enter-details');
                setShippedQuantities(shippedQuantities.map(item => ({
                  ...item,
                  shipped: ''
                })));
              }}
            >
              Ship Only Some Items
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter shipping details and quantities
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-7xl flex flex-col" style={{ height: '90vh', maxHeight: '90vh' }}>
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            Mark as {shipAll ? 'Fully' : 'Partially'} Shipped
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: '0px' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Date Shipped <span className="text-red-500 dark:text-red-400">*</span></label>
              <input type="date" className={inputClass} value={dateShipped} onChange={e => setDateShipped(e.target.value)} />
              {touched && !dateShipped && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Date is required.</div>}
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Carrier <span className="text-red-500 dark:text-red-400">*</span></label>
              {carriersLoading ? (
                <div className="text-gray-600 dark:text-gray-400">Loading carriers...</div>
              ) : (
                <select className={inputClass} value={carrierId} onChange={e => setCarrierId(e.target.value)}>
                  <option value="">Select a carrier</option>
                  {carriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {touched && !carrierId && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Carrier is required.</div>}
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Tracking Number <span className="text-red-500 dark:text-red-400">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={tracking}
                onChange={e => setTracking(e.target.value)}
                placeholder="Required"
              />
              {touched && !tracking && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Tracking number is required.</div>}
            </div>
            <div>
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Notes</label>
              <textarea className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional" />
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block font-medium mb-4 text-lg text-gray-800 dark:text-gray-200">Line Items Shipped</label>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Description</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200 w-32">Qty Ordered</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200 w-40">Qty Shipped</th>
                  </tr>
                </thead>
                <tbody>
                  {shippedQuantities.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-800 dark:text-gray-200">{item.description}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-gray-800 dark:text-gray-200">{item.quantity}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                        <input
                          type="number"
                          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-center"
                          value={item.shipped}
                          min={0}
                          max={item.max !== undefined ? item.max : item.quantity}
                          onChange={e => updateShipped(idx, e.target.value)}
                          placeholder="0"
                          disabled={shipAll}
                        />
                        {touched && (Number(item.shipped) > (item.max !== undefined ? item.max : item.quantity) || Number(item.shipped) < 0) && (
                          <div className="text-red-600 dark:text-red-400 text-xs mt-1">0 ≤ Qty ≤ {item.max !== undefined ? item.max : item.quantity}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {touched && !shippedQuantities.some(q => Number(q.shipped) > 0) && (
              <div className="text-red-600 dark:text-red-400 text-sm mt-2 font-medium">You must ship at least one item.</div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
          {step === 'enter-details' && (
            <button
              type="button"
              className="px-6 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 font-medium"
              onClick={() => setStep('ask-shipment-type')}
              disabled={isLoading}
            >Back</button>
          )}
          <button
            type="button"
            className="px-6 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 font-medium"
            onClick={() => onClose(false)}
            disabled={isLoading}
          >Cancel</button>
          <button
            type="button"
            className={`px-8 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 ${isLoading || !dateShipped || !carrierId || !tracking || !shippedQuantities.some(q => Number(q.shipped) > 0) || shippedQuantities.some(q => isNaN(Number(q.shipped)) || Number(q.shipped) < 0 || Number(q.shipped) > (q.max !== undefined ? q.max : q.quantity)) ? 'opacity-60' : ''}`}
            disabled={isLoading || !dateShipped || !carrierId || !tracking || !shippedQuantities.some(q => Number(q.shipped) > 0) || shippedQuantities.some(q => isNaN(Number(q.shipped)) || Number(q.shipped) < 0 || Number(q.shipped) > (q.max !== undefined ? q.max : q.quantity))}
            onClick={handleSave}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}