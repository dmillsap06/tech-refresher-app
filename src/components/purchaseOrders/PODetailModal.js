import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';
import POReceiveModal from './POReceiveModal';
import CreateInventoryModal from './CreateInventoryModal';
import CreatePartModal from './CreatePartModal';
import MarkAsPaidModal from './MarkAsPaidModal';
import MarkAsShippedModal from './MarkAsShippedModal';
import usePaymentMethods from './usePaymentMethods';
import useShippingCarriers from './useShippingCarriers';
import Portal from './Portal';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full text-center";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

const statusInfo = {
  "Created":   { color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200", emoji: "📝", label: "Created" },
  "Partially Received": { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", emoji: "📦", label: "Partial" },
  "Received":  { color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200", emoji: "✅", label: "Received" },
  "Cancelled": { color: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300", emoji: "❌", label: "Cancelled" },
  "Paid":      { color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200", emoji: "💸", label: "Paid" },
  "Shipped":   { color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200", emoji: "🚚", label: "Shipped" },
  "Partially Shipped": { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", emoji: "📦", label: "Partial Ship" },
  "Archived":  { color: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300", emoji: "📁", label: "Archived" }
};

function formatMoney(val) {
  let n = Number(val);
  if (isNaN(n) || val === '' || val === null || typeof val === 'undefined') return '$0.00';
  return `$${n.toFixed(2)}`;
}

function formatFriendlyDate(dt) {
  if (!dt) return '-';
  let d;
  if (typeof dt === 'string') d = new Date(dt);
  else if (dt.toDate) d = dt.toDate();
  else d = dt;
  const day = d.getDate();
  const daySuffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  return `${d.toLocaleString('en-US', { month: 'long' })} ${day}${daySuffix}, ${d.getFullYear()}`;
}

// New function to format date/time for "Recorded by" lines
function formatDetailedDateTime(dt) {
  if (!dt) return '-';
  let d;
  if (typeof dt === 'string') d = new Date(dt);
  else if (dt.toDate) d = dt.toDate();
  else d = dt;
  
  // Get date components
  const day = d.getDate();
  const daySuffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  
  // Format month, day, year
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  
  // Format time (hours, minutes, AM/PM)
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert to 12-hour format
  
  return `${month} ${day}${daySuffix}, ${year} at ${hours12}:${minutes}${ampm} EST`;
}

const PODetailModal = ({ po, userProfile, showNotification, onClose, onPOUpdated }) => {
  const [editMode, setEditMode] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [showMarkShipped, setShowMarkShipped] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);

  const [formState, setFormState] = useState(() => ({
    vendor: po.vendor,
    vendorOrderNumber: po.vendorOrderNumber || '',
    date: po.date?.toDate?.().toISOString().substr(0, 10) || '',
    notes: po.notes || '',
    lineItems: po.lineItems?.map((li, idx) => ({
      ...li,
      unitPrice: (typeof li.unitPrice === 'number' && li.unitPrice === 0) ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice),
      index: idx,
    })) || [],
    shippingCost: (typeof po.shippingCost === 'number' && po.shippingCost === 0) ? '' : (typeof po.shippingCost === 'number' ? po.shippingCost.toFixed(2) : po.shippingCost),
    otherFees: (typeof po.otherFees === 'number' && po.otherFees === 0) ? '' : (typeof po.otherFees === 'number' ? po.otherFees.toFixed(2) : po.otherFees),
    tax: (typeof po.tax === 'number' && po.tax === 0) ? '' : (typeof po.tax === 'number' ? po.tax.toFixed(2) : po.tax),
    status: po.status,
  }));
  const [saving, setSaving] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const [parts, setParts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [devices, setDevices] = useState([]);
  const [games, setGames] = useState([]);

  const [showCreateInventory, setShowCreateInventory] = useState(false);
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [pendingLineIndex, setPendingLineIndex] = useState(null);

  const { methods: paymentMethods } = usePaymentMethods(userProfile.groupId);
  // Using hook without destructuring to avoid unused vars warning
  useShippingCarriers(userProfile.groupId);

  // Current datetime and user
  const currentUser = userProfile?.username;
  
  const getFormattedDate = () => {
    const now = new Date();
    const options = {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    
    const timeStr = new Intl.DateTimeFormat('en-US', options).format(now);
    
    const dateOptions = {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    const dateStr = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    
    // Add the ordinal suffix (st, nd, rd, th) to the day
    const dayMatch = dateStr.match(/(\d+),/);
    if (dayMatch && dayMatch[1]) {
      const day = parseInt(dayMatch[1], 10);
      let suffix = 'th';
      
      if (day % 10 === 1 && day !== 11) {
        suffix = 'st';
      } else if (day % 10 === 2 && day !== 12) {
        suffix = 'nd';
      } else if (day % 10 === 3 && day !== 13) {
        suffix = 'rd';
      }
      
      // Replace the day number with day + suffix
      const formattedDate = dateStr.replace(/(\d+),/, `$1${suffix},`);
      return `${formattedDate} ${timeStr} EST`;
    }
    
    return `${dateStr} ${timeStr} EST`;
  };

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const [partSnap, accSnap, devSnap, gameSnap] = await Promise.all([
          getDocs(collection(db, 'parts')),
          getDocs(collection(db, 'accessories')),
          getDocs(collection(db, 'deviceTypes')),
          getDocs(collection(db, 'games'))
        ]);
        setParts(partSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAccessories(accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setDevices(devSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setGames(gameSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {}
    };
    fetchCatalogs();
  }, [showCreateInventory, showCreatePart]);

  const errorReported = useRef(false);

  // Button display logic
  const canMarkPaid = formState.status === 'Created';
  const canMarkShipped = formState.status === 'Paid';
  const canReceive = formState.status === 'Shipped' || formState.status === 'Partially Shipped';
  const canComplete = formState.status === 'Received';
  const canEdit = formState.status === 'Created' && userProfile.groupId === po.groupId;

  const subtotal = formState.lineItems.reduce(
    (sum, li) => sum + (Number(li.quantity) * Number(li.unitPrice || 0)), 0
  );
  const total = subtotal + Number(formState.tax || 0) + Number(formState.shippingCost || 0) + Number(formState.otherFees || 0);

  const handleLineChange = (index, field, value) => {
    setFormState(state => ({
      ...state,
      lineItems: state.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleLineCategoryChange = (index, value) => {
    setFormState(state => ({
      ...state,
      lineItems: state.lineItems.map((item, i) =>
        i === index
          ? { ...item, category: value, linkedId: '' }
          : item
      )
    }));
  };

  const handleRemoveLine = (idx) => {
    setFormState(state => ({
      ...state,
      lineItems: state.lineItems.filter((_, i) => i !== idx)
    }));
  };

  const handleAddLine = () => {
    setFormState(state => ({
      ...state,
      lineItems: [
        ...state.lineItems,
        { description: '', quantity: 1, unitPrice: '', category: 'Part', linkedId: '', quantityReceived: 0, index: state.lineItems.length }
      ]
    }));
  };

  const saveEdits = async () => {
    setSaving(true);
    errorReported.current = false;
    for (const li of formState.lineItems) {
      if (!li.linkedId) {
        showNotification('All line items must be linked to a catalog item.', 'error');
        setSaving(false);
        return;
      }
    }
    try {
      await updateDoc(doc(db, 'purchase_orders', po.id), {
        vendor: formState.vendor,
        vendorOrderNumber: formState.vendorOrderNumber,
        date: new Date(formState.date),
        notes: formState.notes,
        lineItems: formState.lineItems.map(li => ({
          ...li,
          unitPrice: li.unitPrice === '' ? 0 : Number(li.unitPrice),
          quantity: Number(li.quantity),
          quantityReceived: typeof li.quantityReceived === 'number' ? li.quantityReceived : 0,
          index: li.index
        })),
        shippingCost: formState.shippingCost === '' ? 0 : Number(formState.shippingCost),
        otherFees: formState.otherFees === '' ? 0 : Number(formState.otherFees),
        tax: formState.tax === '' ? 0 : Number(formState.tax),
        status: formState.status,
        subtotal,
        total,
        updatedAt: new Date(),
      });
      showNotification('PO updated!', 'success');
      setEditMode(false);
      refreshPOData(); // Refresh data after saving
    } catch (err) {
      if (!errorReported.current) {
        logError('PODetailModal-Update', err);
        showNotification('Failed to update PO: ' + err.message, 'error');
        errorReported.current = true;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteWorkOrder = async () => {
    try {
      await updateDoc(doc(db, 'purchase_orders', po.id), {
        status: 'Archived',
        archivedAt: new Date(),
        statusHistory: arrayUnion({
          status: 'Archived',
          by: userProfile.displayName || userProfile.email,
          at: new Date().toISOString(),
          note: 'Work order completed and archived'
        })
      });
      showNotification('Work order archived!', 'success');
      onClose();
    } catch (err) {
      showNotification('Failed to archive work order: ' + err.message, 'error');
    }
  };

  const getLinkedDisplay = (item) => {
    if (!item.linkedId) return null;
    switch (item.category) {
      case 'Part':       return (parts.find(x => x.id === item.linkedId)?.name || item.linkedId);
      case 'Accessory':  return (accessories.find(x => x.id === item.linkedId)?.name || item.linkedId);
      case 'Device':     return (devices.find(x => x.id === item.linkedId)?.name || item.linkedId);
      case 'Game':       return (games.find(x => x.id === item.linkedId)?.name || item.linkedId);
      default:           return item.linkedId;
    }
  };

  const getCatalogList = (category) => {
    switch (category) {
      case 'Part': return parts;
      case 'Accessory': return accessories;
      case 'Device': return devices;
      case 'Game': return games;
      default: return [];
    }
  };

  const handleCreatedInventory = (newInv) => {
    setShowCreateInventory(false);
    if (pendingLineIndex !== null) {
      handleLineChange(pendingLineIndex, 'linkedId', newInv.id);
      setPendingLineIndex(null);
    }
  };
  const handleCreatedPart = (newPart) => {
    setShowCreatePart(false);
    if (pendingLineIndex !== null) {
      handleLineChange(pendingLineIndex, 'linkedId', newPart.id);
      setPendingLineIndex(null);
    }
    setParts(parts => [...parts, newPart]);
  };

  // Function to refresh PO data after operations
  const refreshPOData = async () => {
    try {
      const poDoc = await getDoc(doc(db, 'purchase_orders', po.id));
      if (poDoc.exists()) {
        // Get the fresh data with ID
        const freshPO = {
          id: po.id,
          ...poDoc.data()
        };
        
        // Update local state for immediate UI refresh
        setFormState(state => ({
          ...state,
          lineItems: freshPO.lineItems?.map((li, idx) => ({
            ...li,
            unitPrice: (typeof li.unitPrice === 'number' && li.unitPrice === 0) ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice),
            index: idx,
          })) || [],
          status: freshPO.status,
        }));
        
        // If parent provided an update callback, use it
        if (typeof onPOUpdated === 'function') {
          onPOUpdated(freshPO);
        }
      }
    } catch (err) {
      console.error("Error refreshing PO data:", err);
    }
  };

  const statusHistory = po.statusHistory || [];

  // ---- PAYMENT HISTORY ----

  async function handleMarkPaid(paymentData) {
    setSavingPayment(true);
    try {
      await updateDoc(doc(db, 'purchase_orders', po.id), {
        payments: arrayUnion({
          ...paymentData,
          method: paymentData.method,
          recordedBy: currentUser,
          recordedAt: getFormattedDate,
        }),
        status: 'Paid',
        statusHistory: arrayUnion({
          status: 'Paid',
          by: currentUser,
          at: getFormattedDate,
          note: paymentData.notes || `Marked paid via ${paymentData.method.nickname}`
        })
      });
      showNotification('Payment recorded!', 'success');
      setShowMarkPaid(false);
      refreshPOData(); // Refresh data after payment
    } catch (err) {
      showNotification('Failed to record payment', 'error');
    } finally {
      setSavingPayment(false);
    }
  }

  function PaymentHistory() {
    if (!po.payments || po.payments.length === 0) return <div className="text-gray-600 dark:text-gray-400">No payments recorded for this PO.</div>;
    return (
      <ul>
        {po.payments.map((pay, i) => (
          <li key={i} className="mb-2 border-b dark:border-gray-700 pb-1">
            <div className="text-gray-800 dark:text-gray-300">
              <b>{formatMoney(pay.amountPaid)}</b> paid on {formatFriendlyDate(pay.datePaid)}
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              via <span className="font-semibold">{pay.method.nickname}</span>
              {" "}({pay.method.type}{pay.method.lastFour ? `, ****${pay.method.lastFour}` : ''})
              {pay.method.notes && <> - {pay.method.notes}</>}
            </div>
            {pay.reference && <div className="text-gray-700 dark:text-gray-300">Ref: {pay.reference}</div>}
            {pay.notes && <div className="text-gray-700 dark:text-gray-300">Notes: {pay.notes}</div>}
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Recorded by {pay.recordedBy} on {formatDetailedDateTime(pay.recordedAt)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // ---- SHIPMENT HISTORY ----

  async function handleMarkShipped(shipmentData) {
    setSavingShipment(true);
    errorReported.current = false;
    try {
      const totalQty = formState.lineItems.reduce((sum, li) => sum + Number(li.quantity), 0);
      const alreadyShippedQty = (po.shipments || []).reduce(
        (sum, s) => sum + s.shippedLineItems?.reduce((s2, sli) => s2 + Number(sli.shipped || 0), 0
      ), 0);
      const newThisShipmentQty = shipmentData.shippedLineItems.reduce((sum, sli) => sum + Number(sli.shipped || 0), 0);
      const newTotalShipped = alreadyShippedQty + newThisShipmentQty;

      let newStatus = 'Partially Shipped';
      if (newTotalShipped >= totalQty && totalQty > 0) newStatus = 'Shipped';

      // Clean up the shipment data to ensure no undefined values
      const cleanShipmentData = {
        dateShipped: shipmentData.dateShipped || new Date().toISOString().substring(0, 10),
        carrier: shipmentData.carrier || null, // { id, name }
        tracking: shipmentData.tracking || "",
        notes: shipmentData.notes || "",
        shippedLineItems: shipmentData.shippedLineItems.map(item => ({
          index: typeof item.index === 'number' ? item.index : 0,
          description: item.description || "Unnamed item",
          shipped: Number(item.shipped) || 0,
          lineIndex: typeof item.lineIndex === 'number' ? item.lineIndex : null,
          id: item.id || null,
          category: item.category || null,
          linkedId: item.linkedId || null,
          quantity: Number(item.quantity) || 0
        })),
        recordedBy: currentUser,
        recordedAt: getFormattedDate,
      };

      await updateDoc(doc(db, 'purchase_orders', po.id), {
        shipments: arrayUnion(cleanShipmentData),
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          by: currentUser,
          at: getFormattedDate,
          note: shipmentData.notes || (shipmentData.tracking ? `Tracking: ${shipmentData.tracking}` : '')
        })
      });
      showNotification('Shipment recorded!', 'success');
      setShowMarkShipped(false);
      refreshPOData(); // Refresh data after shipment
    } catch (err) {
      if (!errorReported.current) {
        logError('PODetailModal-MarkShipped', err);
        showNotification('Failed to record shipment: ' + err.message, 'error');
        errorReported.current = true;
      }
    } finally {
      setSavingShipment(false);
    }
  }

  function ShipmentHistory() {
    if (!po.shipments || po.shipments.length === 0) return <div className="text-gray-600 dark:text-gray-400">No shipments recorded for this PO.</div>;
    return (
      <ul>
        {po.shipments.map((ship, i) => (
          <li key={i} className="mb-2 border-b dark:border-gray-700 pb-1">
            <div className="text-gray-800 dark:text-gray-300">
              <b>{formatFriendlyDate(ship.dateShipped)}</b>
              {ship.carrier && ship.carrier.name && (
                <> — <span className="font-semibold">{ship.carrier.name}</span></>
              )}
              {ship.tracking && (
                <> — Tracking: <span className="font-mono">{ship.tracking}</span></>
              )}
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              Items shipped:
              <ul className="pl-4 text-xs text-gray-700 dark:text-gray-300">
                {ship.shippedLineItems.map((sli, j) =>
                  sli.shipped > 0 && (
                    <li key={j}>{sli.description}: <b>{sli.shipped}</b></li>
                  )
                )}
              </ul>
            </div>
            {ship.notes && <div className="text-gray-700 dark:text-gray-300">Notes: {ship.notes}</div>}
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Recorded by {ship.recordedBy} on {formatDetailedDateTime(ship.recordedAt)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // ---- RECEIVE HISTORY ----
  
  function ReceiveHistory() {
    if (!po.receivements || po.receivements.length === 0) return <div className="text-gray-600 dark:text-gray-400">No receive records for this PO.</div>;
    return (
      <ul>
        {po.receivements.map((rec, i) => (
          <li key={i} className="mb-2 border-b dark:border-gray-700 pb-1">
            <div className="text-gray-800 dark:text-gray-300">
              <b>{formatFriendlyDate(rec.dateReceived)}</b>
            </div>
            <div className="text-gray-700 dark:text-gray-300">
              Items received:
              <ul className="pl-4 text-xs text-gray-700 dark:text-gray-300">
                {rec.receivedLineItems.map((rli, j) =>
                  rli.received > 0 && (
                    <li key={j}>{rli.description}: <b>{rli.received}</b></li>
                  )
                )}
              </ul>
            </div>
            {rec.notes && <div className="text-gray-700 dark:text-gray-300">Notes: {rec.notes}</div>}
            <div className="text-xs text-gray-400 dark:text-gray-500">
              Recorded by {rec.recordedBy} on {formatDetailedDateTime(rec.recordedAt)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // ---- BADGE ----
  const badge = (() => {
    const { color, emoji, label } = statusInfo[formState.status] || { color: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300", emoji: "❓", label: formState.status };
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 ml-3 text-base font-semibold ${color} border border-gray-200 dark:border-gray-700 shadow-sm`}>
        <span className="mr-1 text-lg">{emoji}</span>
        {label}
      </span>
    );
  })();

  // ---- LINE ITEMS TABLES ----
  const lineItemsEditTable = (
    <div className="mb-6">
      <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Line Items</label>
      <table className="min-w-full border rounded mb-2 dark:border-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Description</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Category</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Catalog Item</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Qty</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Unit Price</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Total</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800">
          {formState.lineItems.map((li, idx) => (
            <tr key={idx} className="border-t dark:border-gray-700">
              <td>
                <input
                  type="text"
                  className={inputClass}
                  value={li.description}
                  onChange={e => handleLineChange(idx, 'description', e.target.value)}
                />
              </td>
              <td>
                <select
                  className={inputClass}
                  value={li.category}
                  onChange={e => handleLineCategoryChange(idx, e.target.value)}
                >
                  <option value="Part">Part</option>
                  <option value="Accessory">Accessory</option>
                  <option value="Device">Device</option>
                  <option value="Game">Game</option>
                </select>
              </td>
              <td>
                <select
                  className={inputClass}
                  value={li.linkedId}
                  onChange={e => handleLineChange(idx, 'linkedId', e.target.value)}
                >
                  <option value="">Select</option>
                  {getCatalogList(li.category).map(item => (
                    <option key={item.id} value={item.id}>{item.name || item.id}</option>
                  ))}
                </select>
                {li.category === 'Part' && (
                  <button
                    className="ml-2 px-2 py-1 bg-green-200 dark:bg-green-700 rounded text-xs text-gray-800 dark:text-gray-200"
                    type="button"
                    onClick={() => {
                      setShowCreatePart(true);
                      setPendingLineIndex(idx);
                    }}
                  >+ New</button>
                )}
                {li.category === 'Device' && (
                  <button
                    className="ml-2 px-2 py-1 bg-green-200 dark:bg-green-700 rounded text-xs text-gray-800 dark:text-gray-200"
                    type="button"
                    onClick={() => {
                      setShowCreateInventory(true);
                      setPendingLineIndex(idx);
                    }}
                  >+ New</button>
                )}
              </td>
              <td>
                <input
                  type="number"
                  className={inputClass}
                  value={li.quantity}
                  min={1}
                  onChange={e => handleLineChange(idx, 'quantity', e.target.value.replace(/[^0-9]/g, ''))}
                />
              </td>
              <td>
                <div className={dollarInputWrapper}>
                  <span className={dollarPrefix}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    className={inputClass + " pl-6"}
                    value={li.unitPrice}
                    onChange={e => handleLineChange(idx, 'unitPrice', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </div>
              </td>
              <td className="text-gray-800 dark:text-gray-200">
                {formatMoney(Number(li.quantity) * Number(li.unitPrice || 0))}
              </td>
              <td>
                <button
                  type="button"
                  className="px-2 py-1 bg-red-300 dark:bg-red-700 rounded text-xs text-gray-800 dark:text-gray-200"
                  onClick={() => handleRemoveLine(idx)}
                >Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={handleAddLine}
      >+ Add Line Item</button>
    </div>
  );

  const lineItemsViewTable = (
    <div className="mb-6">
      <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Line Items</label>
      <table className="min-w-full border rounded mb-2 dark:border-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Description</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Category</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Catalog Item</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Qty</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Unit Price</th>
            <th className="px-2 py-1 text-gray-700 dark:text-gray-200">Total</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800">
          {formState.lineItems.map((li, idx) => (
            <tr key={idx} className="border-t dark:border-gray-700">
              <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{li.description}</td>
              <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{li.category}</td>
              <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{getLinkedDisplay(li)}</td>
              <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{li.quantity}</td>
              <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{formatMoney(li.unitPrice)}</td>
              <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{formatMoney(Number(li.quantity) * Number(li.unitPrice || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ---- FIELDS BLOCKS ----

  // Vendor, Vendor Order #, Order Date all in one line
  const poHeaderFields = (
    <div className="mb-6 flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Vendor</label>
        {editMode ? (
          <input
            type="text"
            className={inputClass}
            value={formState.vendor}
            onChange={e => setFormState(f => ({ ...f, vendor: e.target.value }))}
          />
        ) : <div className="text-gray-800 dark:text-gray-200">{formState.vendor}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Vendor Order #</label>
        {editMode ? (
          <input
            type="text"
            className={inputClass}
            value={formState.vendorOrderNumber}
            onChange={e => setFormState(f => ({ ...f, vendorOrderNumber: e.target.value }))}
          />
        ) : <div className="text-gray-800 dark:text-gray-200">{formState.vendorOrderNumber || '-'}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Order Date</label>
        {editMode ? (
          <input
            type="date"
            className={inputClass}
            value={formState.date}
            onChange={e => setFormState(f => ({ ...f, date: e.target.value }))}
          />
        ) : <div className="text-gray-800 dark:text-gray-200">{formatFriendlyDate(formState.date)}</div>}
      </div>
    </div>
  );

  // Tax, Shipping Cost, Other Fees, Subtotal, Total all in one line
  const poSummaryFields = (
    <div className="mb-6 flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Tax</label>
        {editMode ? (
          <div className={dollarInputWrapper}>
            <span className={dollarPrefix}>$</span>
            <input
              type="number"
              step="0.01"
              className={inputClass + " pl-6"}
              value={formState.tax}
              onChange={e => setFormState(f => ({ ...f, tax: e.target.value.replace(/[^0-9.]/g, '') }))}
            />
          </div>
        ) : <div className="text-gray-800 dark:text-gray-200">{formatMoney(formState.tax)}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Shipping Cost</label>
        {editMode ? (
          <div className={dollarInputWrapper}>
            <span className={dollarPrefix}>$</span>
            <input
              type="number"
              step="0.01"
              className={inputClass + " pl-6"}
              value={formState.shippingCost}
              onChange={e => setFormState(f => ({ ...f, shippingCost: e.target.value.replace(/[^0-9.]/g, '') }))}
            />
          </div>
        ) : <div className="text-gray-800 dark:text-gray-200">{formatMoney(formState.shippingCost)}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Other Fees</label>
        {editMode ? (
          <div className={dollarInputWrapper}>
            <span className={dollarPrefix}>$</span>
            <input
              type="number"
              step="0.01"
              className={inputClass + " pl-6"}
              value={formState.otherFees}
              onChange={e => setFormState(f => ({ ...f, otherFees: e.target.value.replace(/[^0-9.]/g, '') }))}
            />
          </div>
        ) : <div className="text-gray-800 dark:text-gray-200">{formatMoney(formState.otherFees)}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Subtotal</label>
        <div className="text-gray-800 dark:text-gray-200">{formatMoney(subtotal)}</div>
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Total</label>
        <div className="text-gray-800 dark:text-gray-200">{formatMoney(total)}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-7xl relative flex flex-col h-[98vh]">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-xl">&times;</button>
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              Purchase Order Details
            </h2>
            {badge}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '75vh' }}>
            {/* PO header fields (Vendor, Vendor Order #, Order Date) */}
            {poHeaderFields}
            {/* PO line items */}
            {editMode ? lineItemsEditTable : lineItemsViewTable}
            {/* Notes */}
            <div className="mb-6">
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Notes</label>
              {editMode ? (
                <textarea
                  className={inputClass}
                  value={formState.notes}
                  onChange={e => setFormState(f => ({ ...f, notes: e.target.value }))}
                />
              ) : <div className="whitespace-pre-line text-gray-800 dark:text-gray-200">{formState.notes}</div>}
            </div>
            {/* PO summary fields (Tax, Shipping, Fees, Subtotal, Total) */}
            {poSummaryFields}
            {/* Status History */}
            <div className="mb-6">
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Status History</label>
              {statusHistory.length === 0 ? (
                <div className="text-gray-400 dark:text-gray-500 text-sm">No status changes recorded yet.</div>
              ) : (
                <ul className="text-sm bg-gray-100 dark:bg-gray-700 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                  {statusHistory.map((entry, i) => (
                    <li key={i} className="text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">{entry.status}</span>
                      {" by "}
                      <span>{entry.by}</span>
                      {" on "}
                      <span title={formatFriendlyDate(entry.at)}>{formatFriendlyDate(entry.at)}</span>
                      {entry.note ? <>: <span className="italic">{entry.note}</span></> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Payment History */}
            <div className="mb-6">
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Payment History</label>
              <PaymentHistory />
            </div>
            {/* Shipment History */}
            <div className="mb-6">
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Shipment History</label>
              <ShipmentHistory />
            </div>
            {/* Receive History */}
            <div className="mb-6">
              <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Receive History</label>
              <ReceiveHistory />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            {canMarkPaid && (
              <button
                className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => setShowMarkPaid(true)}
              >
                Mark as Paid
              </button>
            )}
            {canMarkShipped && (
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setShowMarkShipped(true)}
              >
                Mark as Shipped
              </button>
            )}
            {canReceive && (
              <button
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                onClick={() => setShowReceiveModal(true)}
              >
                Receive
              </button>
            )}
            {canComplete && (
              <button
                className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-900"
                onClick={handleCompleteWorkOrder}
              >
                Complete Work Order
              </button>
            )}
            {editMode ? (
              <>
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
                  onClick={() => {
                    setEditMode(false);
                    setFormState({
                      vendor: po.vendor,
                      vendorOrderNumber: po.vendorOrderNumber || '',
                      date: po.date?.toDate?.().toISOString().substr(0, 10) || '',
                      notes: po.notes || '',
                      lineItems: po.lineItems?.map((li, idx) => ({
                        ...li,
                        unitPrice: (typeof li.unitPrice === 'number' && li.unitPrice === 0) ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice),
                        index: idx,
                      })) || [],
                      shippingCost: (typeof po.shippingCost === 'number' && po.shippingCost === 0) ? '' : (typeof po.shippingCost === 'number' ? po.shippingCost.toFixed(2) : po.shippingCost),
                      otherFees: (typeof po.otherFees === 'number' && po.otherFees === 0) ? '' : (typeof po.otherFees === 'number' ? po.otherFees.toFixed(2) : po.otherFees),
                      tax: (typeof po.tax === 'number' && po.tax === 0) ? '' : (typeof po.tax === 'number' ? po.tax.toFixed(2) : po.tax),
                      status: po.status,
                    });
                  }}
                >Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                  disabled={saving}
                  onClick={saveEdits}
                >{saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : canEdit && (
              <button
                type="button"
                className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                onClick={() => setEditMode(true)}
              >Edit
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
              onClick={onClose}
            >Close
            </button>
          </div>
        </div>
      </div>
      {/* All modals are now wrapped in a Portal to isolate them from this component's CSS context */}
      <Portal>
        {showReceiveModal && (
          <POReceiveModal
            po={po}
            userProfile={userProfile}
            showNotification={showNotification}
            onClose={() => setShowReceiveModal(false)}
            onReceived={refreshPOData} // Pass refresh callback
            groupId={userProfile.groupId}
          />
        )}
        {showCreateInventory && (
          <CreateInventoryModal
            userProfile={userProfile}
            onCreated={handleCreatedInventory}
            onClose={() => setShowCreateInventory(false)}
            showNotification={showNotification}
          />
        )}
        {showCreatePart && (
          <CreatePartModal
            userProfile={userProfile}
            onCreated={handleCreatedPart}
            onClose={() => setShowCreatePart(false)}
            showNotification={showNotification}
          />
        )}
        {showMarkPaid && (
          <MarkAsPaidModal
            open={showMarkPaid}
            onClose={() => setShowMarkPaid(false)}
            onSave={handleMarkPaid}
            defaultAmount={total}
            defaultDate={new Date().toISOString().slice(0, 10)}
            loading={savingPayment}
            groupId={userProfile.groupId}
            paymentMethods={paymentMethods}
          />
        )}
        {showMarkShipped && (
          <MarkAsShippedModal
            open={showMarkShipped}
            onClose={() => setShowMarkShipped(false)}
            onSave={handleMarkShipped}
            lineItems={formState.lineItems}
            defaultDate={new Date().toISOString().slice(0, 10)}
            loading={savingShipment}
            groupId={userProfile.groupId}
            refreshParent={refreshPOData} // Pass refresh callback
          />
        )}
      </Portal>
    </>
  );
};

export default PODetailModal;