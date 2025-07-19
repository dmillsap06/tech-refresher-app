import React, { useState, useRef } from 'react';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";

function getRemaining(li) {
  return Math.max(
    0,
    Number(li.quantity || 0) - Number(li.quantityReceived || 0)
  );
}

const POReceiveModal = ({ po, userProfile, showNotification, onClose }) => {
  const [step, setStep] = useState('ask-partial');
  const [receiveAll, setReceiveAll] = useState(true);
  const [quantities, setQuantities] = useState(() =>
    po.lineItems.map(li => getRemaining(li))
  );
  const [saving, setSaving] = useState(false);
  const errorReported = useRef(false);

  // Helper: Show linked display name/id
  const getLinkedDisplay = (item) => {
    if (item.category === 'Inventory' && item.inventoryName) return item.inventoryName;
    if (item.category === 'Part' && item.partName) return item.partName;
    if (item.category === 'Inventory' && item.inventoryId) return item.inventoryId;
    if (item.category === 'Part' && item.partId) return item.partId;
    return '';
  };

  // Block receive if any line item cannot be matched (enforced)
  const allLinked = po.lineItems.every(
    li =>
      (li.category === 'Inventory' && li.inventoryId) ||
      (li.category === 'Part' && li.partId)
  );

  if (!allLinked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-lg relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
          <h2 className="text-xl font-bold mb-4 text-red-700 dark:text-red-300">Cannot Receive</h2>
          <p className="mb-6 text-red-600">All line items must be linked to an inventory or part item before receiving.</p>
          <div className="flex justify-end">
            <button
              className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
              onClick={onClose}
            >Close</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Ask if they want to receive all or partial
  if (step === 'ask-partial') {
    const canFullyReceive = po.lineItems.every(li => getRemaining(li) > 0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-lg relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
          <h2 className="text-xl font-bold mb-4 text-green-700 dark:text-green-300">Receive Purchase Order</h2>
          <p className="mb-6">Would you like to receive the entire PO, or only some items?</p>
          <div className="flex flex-col gap-3">
            <button
              className="px-5 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-70"
              onClick={() => {
                setReceiveAll(true);
                setStep('enter-qty');
                setQuantities(po.lineItems.map(li => getRemaining(li)));
              }}
              disabled={!canFullyReceive}
            >
              Receive All Items
            </button>
            <button
              className="px-5 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
              onClick={() => {
                setReceiveAll(false);
                setStep('enter-qty');
                setQuantities(po.lineItems.map(li => ''));
              }}
            >
              Receive Only Some Items
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter quantities
  const handleQtyChange = idx => e => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (val === '') val = '';
    else val = Math.max(0, Math.min(Number(val), getRemaining(po.lineItems[idx])));
    setQuantities(qs => qs.map((q, i) => i === idx ? val : q));
  };

  const handleReceive = async () => {
    setSaving(true);
    errorReported.current = false;
    try {
      const newLineItems = po.lineItems.map((li, idx) => {
        let qtyToReceive = Number(quantities[idx] || 0);
        if (qtyToReceive < 0) qtyToReceive = 0;
        if (qtyToReceive > getRemaining(li)) qtyToReceive = getRemaining(li);
        return {
          ...li,
          quantityReceived: Number(li.quantityReceived || 0) + qtyToReceive
        };
      });

      // Status logic
      const allReceived = newLineItems.every(li =>
        Number(li.quantityReceived || 0) >= Number(li.quantity || 0)
      );
      const someReceived = newLineItems.some(li =>
        Number(li.quantityReceived || 0) > 0
      );
      let newStatus = po.status;
      if (allReceived) newStatus = 'Received';
      else if (someReceived) newStatus = 'Partially Received';

      // Status history note
      const summary = newLineItems
        .map((li, idx) => {
          const prev = Number(po.lineItems[idx].quantityReceived || 0);
          const now = Number(li.quantityReceived || 0);
          const recNow = now - prev;
          return recNow > 0
            ? `${li.description || 'Item ' + (idx + 1)}: +${recNow}`
            : null;
        })
        .filter(Boolean)
        .join(', ');

      const statusHistory = Array.isArray(po.statusHistory) ? [...po.statusHistory] : [];
      statusHistory.push({
        status: newStatus,
        at: new Date().toISOString(),
        by: userProfile.displayName || userProfile.name || userProfile.email || 'Unknown',
        note: summary
      });

      // Update inventory/parts
      for (let idx = 0; idx < newLineItems.length; idx++) {
        const li = po.lineItems[idx];
        const qty = Number(quantities[idx] || 0);
        if (qty > 0) {
          if (li.category === 'Inventory' && li.inventoryId) {
            await updateDoc(doc(db, 'inventory', li.inventoryId), {
              stock: increment(qty),
              updatedAt: serverTimestamp()
            });
          } else if (li.category === 'Part' && li.partId) {
            await updateDoc(doc(db, 'parts', li.partId), {
              stock: increment(qty),
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      await updateDoc(doc(db, 'purchase_orders', po.id), {
        lineItems: newLineItems,
        status: newStatus,
        statusHistory,
        updatedAt: serverTimestamp(),
      });

      showNotification(
        allReceived
          ? 'PO fully received!'
          : 'PO partially received!',
        'success'
      );
      onClose();
    } catch (err) {
      if (!errorReported.current) {
        logError('POReceiveModal-Receive', err);
        showNotification('Error receiving PO: ' + err.message, 'error');
        errorReported.current = true;
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-3 text-green-700 dark:text-green-300">Receive Purchase Order</h2>
        <p className="mb-4">Enter the quantities you have received for each item:</p>
        <table className="min-w-full border rounded mb-3">
          <thead>
            <tr>
              <th className="px-2 py-1">Description</th>
              <th className="px-2 py-1 text-center">Ordered</th>
              <th className="px-2 py-1 text-center">Prev. Received</th>
              <th className="px-2 py-1 text-center">Receive Now</th>
              <th className="px-2 py-1">Linked Item</th>
            </tr>
          </thead>
          <tbody>
            {po.lineItems.map((li, idx) => {
              const remaining = getRemaining(li);
              return (
                <tr key={idx}>
                  <td>{li.description}</td>
                  <td className="text-center">{li.quantity}</td>
                  <td className="text-center">{li.quantityReceived || 0}</td>
                  <td className="text-center">
                    {receiveAll ? (
                      <input
                        type="number"
                        className={inputClass + " w-24 text-center"}
                        value={quantities[idx]}
                        min={0}
                        max={remaining}
                        disabled
                      />
                    ) : (
                      <input
                        type="number"
                        className={inputClass + " w-24 text-center"}
                        value={quantities[idx]}
                        min={0}
                        max={remaining}
                        onChange={handleQtyChange(idx)}
                        placeholder={`Max: ${remaining}`}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    )}
                  </td>
                  <td>
                    {li.category === 'Inventory'
                      ? (li.inventoryName || li.inventoryId)
                      : (li.partName || li.partId)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
            onClick={onClose}
            disabled={saving}
          >Cancel</button>
          <button
            type="button"
            className="px-5 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700"
            disabled={saving}
            onClick={handleReceive}
          >
            {saving ? "Saving..." : "Submit Receive"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POReceiveModal;