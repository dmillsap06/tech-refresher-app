import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';
import POReceiveModal from './POReceiveModal';
import CreateInventoryModal from './CreateInventoryModal';
import CreatePartModal from './CreatePartModal';
import MarkAsPaidModal from './MarkAsPaidModal';
import MarkAsShippedModal from './MarkAsShippedModal';
import usePaymentMethods from './usePaymentMethods';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full text-center";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

const statusInfo = {
  "Created":   { color: "bg-blue-100 text-blue-700", emoji: "📝", label: "Created" },
  "Partially Received": { color: "bg-yellow-100 text-yellow-800", emoji: "📦", label: "Partial" },
  "Received":  { color: "bg-green-100 text-green-700", emoji: "✅", label: "Received" },
  "Cancelled": { color: "bg-gray-200 text-gray-500", emoji: "❌", label: "Cancelled" },
  "Paid":      { color: "bg-indigo-100 text-indigo-700", emoji: "💸", label: "Paid" },
  "Shipped":   { color: "bg-blue-100 text-blue-700", emoji: "🚚", label: "Shipped" },
  "Partially Shipped": { color: "bg-yellow-100 text-yellow-800", emoji: "📦", label: "Partial Ship" },
  "Archived":  { color: "bg-gray-200 text-gray-600", emoji: "📁", label: "Archived" }
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

const PODetailModal = ({ po, userProfile, showNotification, onClose }) => {
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

  const statusHistory = po.statusHistory || [];

  // ---- PAYMENT HISTORY ----

  async function handleMarkPaid(paymentData) {
    setSavingPayment(true);
    try {
      await updateDoc(doc(db, 'purchase_orders', po.id), {
        payments: arrayUnion({
          ...paymentData,
          method: paymentData.method,
          recordedBy: userProfile.displayName || userProfile.email,
          recordedAt: new Date().toISOString(),
        }),
        status: 'Paid',
        statusHistory: arrayUnion({
          status: 'Paid',
          by: userProfile.displayName || userProfile.email,
          at: new Date().toISOString(),
          note: paymentData.notes || `Marked paid via ${paymentData.method.nickname}`
        })
      });
      showNotification('Payment recorded!', 'success');
      setShowMarkPaid(false);
    } catch (err) {
      showNotification('Failed to record payment', 'error');
    } finally {
      setSavingPayment(false);
    }
  }

  function PaymentHistory() {
    if (!po.payments || po.payments.length === 0) return <div>No payments recorded for this PO.</div>;
    return (
      <ul>
        {po.payments.map((pay, i) => (
          <li key={i} className="mb-2 border-b pb-1">
            <div>
              <b>{formatMoney(pay.amountPaid)}</b> paid on {formatFriendlyDate(pay.datePaid)}
            </div>
            <div>
              via <span className="font-semibold">{pay.method.nickname}</span>
              {" "}({pay.method.type}{pay.method.lastFour ? `, ****${pay.method.lastFour}` : ''})
              {pay.method.notes && <> - {pay.method.notes}</>}
            </div>
            {pay.reference && <div>Ref: {pay.reference}</div>}
            {pay.notes && <div>Notes: {pay.notes}</div>}
            <div className="text-xs text-gray-400">
              Recorded by {pay.recordedBy} at {formatFriendlyDate(pay.recordedAt)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // ---- SHIPMENT HISTORY ----

  async function handleMarkShipped(shipmentData) {
    setSavingShipment(true);
    try {
      const totalQty = formState.lineItems.reduce((sum, li) => sum + Number(li.quantity), 0);
      const alreadyShippedQty = (po.shipments || []).reduce(
        (sum, s) => sum + s.shippedLineItems?.reduce((s2, sli) => s2 + Number(sli.shipped || 0), 0
      ), 0);
      const newThisShipmentQty = shipmentData.shippedLineItems.reduce((sum, sli) => sum + Number(sli.shipped || 0), 0);
      const newTotalShipped = alreadyShippedQty + newThisShipmentQty;

      let newStatus = 'Partially Shipped';
      if (newTotalShipped >= totalQty && totalQty > 0) newStatus = 'Shipped';

      await updateDoc(doc(db, 'purchase_orders', po.id), {
        shipments: arrayUnion({
          ...shipmentData,
          recordedBy: userProfile.displayName || userProfile.email,
          recordedAt: new Date().toISOString(),
        }),
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          by: userProfile.displayName || userProfile.email,
          at: new Date().toISOString(),
          note: shipmentData.notes || (shipmentData.tracking ? `Tracking: ${shipmentData.tracking}` : '')
        })
      });
      showNotification('Shipment recorded!', 'success');
      setShowMarkShipped(false);
    } catch (err) {
      showNotification('Failed to record shipment', 'error');
    } finally {
      setSavingShipment(false);
    }
  }

  function ShipmentHistory() {
    if (!po.shipments || po.shipments.length === 0) return <div>No shipments recorded for this PO.</div>;
    return (
      <ul>
        {po.shipments.map((ship, i) => (
          <li key={i} className="mb-2 border-b pb-1">
            <div>
              <b>{formatFriendlyDate(ship.dateShipped)}</b>{ship.tracking && <> — Tracking: <span className="font-mono">{ship.tracking}</span></>}
            </div>
            <div>
              Items shipped:
              <ul className="pl-4 text-xs">
                {ship.shippedLineItems.map((sli, j) =>
                  sli.shipped > 0 && (
                    <li key={j}>{sli.description}: <b>{sli.shipped}</b></li>
                  )
                )}
              </ul>
            </div>
            {ship.notes && <div>Notes: {ship.notes}</div>}
            <div className="text-xs text-gray-400">
              Recorded by {ship.recordedBy} at {formatFriendlyDate(ship.recordedAt)}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // ---- BADGE ----
  const badge = (() => {
    const { color, emoji, label } = statusInfo[formState.status] || { color: "bg-gray-200 text-gray-600", emoji: "❓", label: formState.status };
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 ml-3 text-base font-semibold ${color} border border-gray-200 shadow-sm`}>
        <span className="mr-1 text-lg">{emoji}</span>
        {label}
      </span>
    );
  })();

  // ---- LINE ITEMS TABLES ----
  const lineItemsEditTable = (
    <div className="mb-6">
      <label className="block font-medium mb-1">Line Items</label>
      <table className="min-w-full border rounded mb-2">
        <thead>
          <tr>
            <th className="px-2 py-1">Description</th>
            <th className="px-2 py-1">Category</th>
            <th className="px-2 py-1">Catalog Item</th>
            <th className="px-2 py-1">Qty</th>
            <th className="px-2 py-1">Unit Price</th>
            <th className="px-2 py-1">Total</th>
            <th className="px-2 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {formState.lineItems.map((li, idx) => (
            <tr key={idx}>
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
                    className="ml-2 px-2 py-1 bg-green-200 rounded text-xs"
                    type="button"
                    onClick={() => {
                      setShowCreatePart(true);
                      setPendingLineIndex(idx);
                    }}
                  >+ New</button>
                )}
                {li.category === 'Device' && (
                  <button
                    className="ml-2 px-2 py-1 bg-green-200 rounded text-xs"
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
              <td>
                {formatMoney(Number(li.quantity) * Number(li.unitPrice || 0))}
              </td>
              <td>
                <button
                  type="button"
                  className="px-2 py-1 bg-red-300 rounded text-xs"
                  onClick={() => handleRemoveLine(idx)}
                >Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
        onClick={handleAddLine}
      >+ Add Line Item</button>
    </div>
  );

  const lineItemsViewTable = (
    <div className="mb-6">
      <label className="block font-medium mb-1">Line Items</label>
      <table className="min-w-full border rounded mb-2">
        <thead>
          <tr>
            <th className="px-2 py-1">Description</th>
            <th className="px-2 py-1">Category</th>
            <th className="px-2 py-1">Catalog Item</th>
            <th className="px-2 py-1">Qty</th>
            <th className="px-2 py-1">Unit Price</th>
            <th className="px-2 py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {formState.lineItems.map((li, idx) => (
            <tr key={idx}>
              <td>{li.description}</td>
              <td>{li.category}</td>
              <td>{getLinkedDisplay(li)}</td>
              <td>{li.quantity}</td>
              <td>{formatMoney(li.unitPrice)}</td>
              <td>{formatMoney(Number(li.quantity) * Number(li.unitPrice || 0))}</td>
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
        <label className="block font-medium mb-1">Vendor</label>
        {editMode ? (
          <input
            type="text"
            className={inputClass}
            value={formState.vendor}
            onChange={e => setFormState(f => ({ ...f, vendor: e.target.value }))}
          />
        ) : <div>{formState.vendor}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1">Vendor Order #</label>
        {editMode ? (
          <input
            type="text"
            className={inputClass}
            value={formState.vendorOrderNumber}
            onChange={e => setFormState(f => ({ ...f, vendorOrderNumber: e.target.value }))}
          />
        ) : <div>{formState.vendorOrderNumber || '-'}</div>}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1">Order Date</label>
        {editMode ? (
          <input
            type="date"
            className={inputClass}
            value={formState.date}
            onChange={e => setFormState(f => ({ ...f, date: e.target.value }))}
          />
        ) : <div>{formatFriendlyDate(formState.date)}</div>}
      </div>
    </div>
  );

  // Tax, Shipping Cost, Other Fees, Subtotal, Total all in one line
  const poSummaryFields = (
    <div className="mb-6 flex flex-col md:flex-row gap-4">
      <div className="flex-1">
        <label className="block font-medium mb-1">Tax</label>
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
        ) : formatMoney(formState.tax)}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1">Shipping Cost</label>
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
        ) : formatMoney(formState.shippingCost)}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1">Other Fees</label>
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
        ) : formatMoney(formState.otherFees)}
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1">Subtotal</label>
        <div>{formatMoney(subtotal)}</div>
      </div>
      <div className="flex-1">
        <label className="block font-medium mb-1">Total</label>
        <div>{formatMoney(total)}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-7xl relative flex flex-col h-[98vh]">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
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
            <label className="block font-medium mb-1">Notes</label>
            {editMode ? (
              <textarea
                className={inputClass}
                value={formState.notes}
                onChange={e => setFormState(f => ({ ...f, notes: e.target.value }))}
              />
            ) : <div className="whitespace-pre-line">{formState.notes}</div>}
          </div>
          {/* PO summary fields (Tax, Shipping, Fees, Subtotal, Total) */}
          {poSummaryFields}
          {/* Status History */}
          <div className="mb-6">
            <label className="block font-medium mb-1">Status History</label>
            {statusHistory.length === 0 ? (
              <div className="text-gray-400 text-sm">No status changes recorded yet.</div>
            ) : (
              <ul className="text-sm bg-gray-100 dark:bg-gray-700 rounded p-2 space-y-1 max-h-32 overflow-y-auto">
                {statusHistory.map((entry, i) => (
                  <li key={i}>
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
            <label className="block font-medium mb-1">Payment History</label>
            <PaymentHistory />
          </div>
          {/* Shipment History */}
          <div className="mb-6">
            <label className="block font-medium mb-1">Shipment History</label>
            <ShipmentHistory />
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
                className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
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
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
            onClick={onClose}
          >Close
          </button>
        </div>
        {showReceiveModal && (
          <POReceiveModal
            po={po}
            userProfile={userProfile}
            showNotification={showNotification}
            onClose={() => setShowReceiveModal(false)}
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
          />
        )}
      </div>
    </div>
  );
};

export default PODetailModal;