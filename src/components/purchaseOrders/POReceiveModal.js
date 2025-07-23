import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";

// Helper to get max receivable for a line item, considering shipments
function getMaxReceivable(li, po) {
  const totalShipped = getTotalShipped(li, po);
  return Math.max(
    0,
    Math.min(
      Number(li.quantity || 0),
      totalShipped
    ) - Number(li.quantityReceived || 0)
  );
}

// Helper: total shipped for this line item
function getTotalShipped(li, po) {
  return (po.shipments || [])
    .reduce((sum, s) =>
      sum + (s.shippedLineItems || [])
        .filter(sli =>
          (sli.id && li.id && sli.id === li.id) ||
          (sli.linkedId && li.linkedId && sli.linkedId === li.linkedId) ||
          (sli.lineIndex !== undefined && li.index !== undefined && sli.lineIndex === li.index) ||
          (sli.description && sli.description === li.description)
        )
        .reduce((s2, sli) => s2 + Number(sli.shipped || 0), 0)
    , 0);
}

// Helper to display linked catalog item name (for table)
async function fetchLinkedName(category, linkedId) {
  if (!linkedId) return '';
  let col;
  switch (category) {
    case 'Part': col = 'parts'; break;
    case 'Accessory': col = 'accessories'; break;
    case 'Device': col = 'deviceTypes'; break;
    case 'Game': col = 'games'; break;
    default: return linkedId;
  }
  try {
    const docSnap = await getDoc(doc(db, col, linkedId));
    if (docSnap.exists()) {
      return docSnap.data().name || linkedId;
    }
    return linkedId;
  } catch {
    return linkedId;
  }
}

const POReceiveModal = ({ po, userProfile, showNotification, onClose }) => {
  const [step, setStep] = useState('ask-partial');
  const [receiveAll, setReceiveAll] = useState(true);
  const [quantities, setQuantities] = useState(() =>
    po.lineItems.map(li => getMaxReceivable(li, po))
  );
  const [saving, setSaving] = useState(false);
  const [linkedNames, setLinkedNames] = useState([]); // for table display
  const errorReported = useRef(false);

  // Block receive if any line item is not linked (new logic)
  const allLinked = po.lineItems.every(li => li.linkedId);

  useEffect(() => {
    // Fetch linked catalog item names for display
    const fetchAll = async () => {
      const names = await Promise.all(
        po.lineItems.map(li =>
          li.linkedId ? fetchLinkedName(li.category, li.linkedId) : ''
        )
      );
      setLinkedNames(names);
    };
    fetchAll();
  }, [po.lineItems]);

  if (!allLinked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-lg relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
          <h2 className="text-xl font-bold mb-4 text-red-700 dark:text-red-300">Cannot Receive</h2>
          <p className="mb-6 text-red-600">All line items must be linked to a catalog item before receiving.</p>
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
    const canFullyReceive = po.lineItems.every(li => getMaxReceivable(li, po) > 0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
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
                setQuantities(po.lineItems.map(li => getMaxReceivable(li, po)));
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
    else val = Math.max(0, Math.min(Number(val), getMaxReceivable(po.lineItems[idx], po)));
    setQuantities(qs => qs.map((q, i) => i === idx ? val : q));
  };

  const handleReceive = async () => {
    setSaving(true);
    errorReported.current = false;
    try {
      const newLineItems = po.lineItems.map((li, idx) => {
        let qtyToReceive = Number(quantities[idx] || 0);
        if (qtyToReceive < 0) qtyToReceive = 0;
        if (qtyToReceive > getMaxReceivable(li, po)) qtyToReceive = getMaxReceivable(li, po);
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

      // Update inventory/parts/accessories/devices/games stock if desired
      for (let idx = 0; idx < newLineItems.length; idx++) {
        const li = po.lineItems[idx];
        const qty = Number(quantities[idx] || 0);
        if (qty > 0 && li.linkedId) {
          let col = null;
          switch (li.category) {
            case 'Part': col = 'parts'; break;
            case 'Accessory': col = 'accessories'; break;
            case 'Device': col = 'deviceTypes'; break;
            case 'Game': col = 'games'; break;
            default: break;
          }
          if (col) {
            await updateDoc(doc(db, col, li.linkedId), {
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

  // Shows shipment details for each line item
  const ShipmentsList = ({ lineItem }) => {
    const relevantShipments = (po.shipments || [])
      .filter(ship => 
        ship.shippedLineItems?.some(sli => 
          (sli.id && lineItem.id && sli.id === lineItem.id) ||
          (sli.linkedId && lineItem.linkedId && sli.linkedId === lineItem.linkedId) ||
          (sli.lineIndex !== undefined && lineItem.index !== undefined && sli.lineIndex === lineItem.index) ||
          (sli.description && sli.description === lineItem.description)
        )
      );

    if (relevantShipments.length === 0) return <span className="text-gray-400">No shipments</span>;

    return (
      <div className="text-xs text-gray-600 dark:text-gray-300">
        {relevantShipments.map((ship, idx) => {
          const shippedQty = ship.shippedLineItems
            .filter(sli => 
              (sli.id && lineItem.id && sli.id === lineItem.id) ||
              (sli.linkedId && lineItem.linkedId && sli.linkedId === lineItem.linkedId) ||
              (sli.lineIndex !== undefined && lineItem.index !== undefined && sli.lineIndex === lineItem.index) ||
              (sli.description && sli.description === lineItem.description)
            )
            .reduce((sum, sli) => sum + Number(sli.shipped || 0), 0);

          return (
            <div key={idx} className="mb-1">
              <span>{shippedQty} pcs on {new Date(ship.dateShipped).toLocaleDateString()}</span>
              {ship.carrier && ship.carrier.name && (
                <> via {ship.carrier.name}</>
              )}
              {ship.tracking && (
                <> (tracking: {ship.tracking})</>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl flex flex-col" style={{ height: '90vh', maxHeight: '90vh' }}>
        <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">
            Receive {receiveAll ? 'All' : 'Partial'} Items
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: '0px' }}>
          <div className="mb-4">
            <p>Enter the quantities you have received for each item:</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">Description</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold w-24">Ordered</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold w-32">Shipped</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold w-32">Previously Received</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold w-40">Receive Now</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">Shipment Details</th>
                </tr>
              </thead>
              <tbody>
                {po.lineItems.map((li, idx) => {
                  const maxReceivable = getMaxReceivable(li, po);
                  const totalShipped = getTotalShipped(li, po);
                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <div>{li.description}</div>
                        <div className="text-xs text-gray-500">{linkedNames[idx]}</div>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">{li.quantity}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">{totalShipped}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">{li.quantityReceived || 0}</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                        {receiveAll ? (
                          <input
                            type="number"
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-center"
                            value={quantities[idx]}
                            min={0}
                            max={maxReceivable}
                            disabled
                          />
                        ) : (
                          <input
                            type="number"
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-24 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 text-center"
                            value={quantities[idx]}
                            min={0}
                            max={maxReceivable}
                            onChange={handleQtyChange(idx)}
                            placeholder={`Max: ${maxReceivable}`}
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        )}
                        {maxReceivable <= 0 && !receiveAll && (
                          <div className="text-red-500 text-xs mt-1">Cannot receive more</div>
                        )}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <ShipmentsList lineItem={li} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
          {step === 'enter-qty' && (
            <button
              type="button"
              className="px-6 py-2 rounded bg-gray-500 text-white hover:bg-gray-600 font-medium"
              onClick={() => setStep('ask-partial')}
              disabled={saving}
            >Back</button>
          )}
          <button
            type="button"
            className="px-6 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 font-medium"
            onClick={onClose}
            disabled={saving}
          >Cancel</button>
          <button
            type="button"
            className={`px-8 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 ${saving ? 'opacity-60' : ''}`}
            disabled={saving || quantities.every(q => Number(q) <= 0)}
            onClick={handleReceive}
          >{saving ? 'Saving...' : 'Submit Receive'}</button>
        </div>
      </div>
    </div>
  );
};

export default POReceiveModal;