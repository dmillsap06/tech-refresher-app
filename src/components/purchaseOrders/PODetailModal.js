import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';
import POReceiveModal from './POReceiveModal';
import CreateInventoryModal from './CreateInventoryModal';
import CreatePartModal from './CreatePartModal';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full text-center";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

// Fun status info
const statusInfo = {
  "Created":   { color: "bg-blue-100 text-blue-700", emoji: "📝", label: "Created" },
  "Partially Received": { color: "bg-yellow-100 text-yellow-800", emoji: "📦", label: "Partial" },
  "Received":  { color: "bg-green-100 text-green-700", emoji: "✅", label: "Received" },
  "Cancelled": { color: "bg-gray-200 text-gray-500", emoji: "❌", label: "Cancelled" },
};

function formatMoney(val) {
  let n = Number(val);
  if (isNaN(n) || val === '' || val === null || typeof val === 'undefined') return '$0.00';
  return `$${n.toFixed(2)}`;
}

// Friendly date: January 1st, 2025
function formatFriendlyDate(dt) {
  if (!dt) return '-';
  let d;
  if (typeof dt === 'string') d = new Date(dt);
  else if (dt.toDate) d = dt.toDate();
  else d = dt;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

const PODetailModal = ({ po, userProfile, showNotification, onClose }) => {
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState(() => ({
    vendor: po.vendor,
    vendorOrderNumber: po.vendorOrderNumber || '',
    date: po.date?.toDate?.().toISOString().substr(0, 10) || '',
    notes: po.notes || '',
    lineItems: po.lineItems?.map(li => ({
      ...li,
      unitPrice: (typeof li.unitPrice === 'number' && li.unitPrice === 0) ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice)
    })) || [],
    shippingCost: (typeof po.shippingCost === 'number' && po.shippingCost === 0) ? '' : (typeof po.shippingCost === 'number' ? po.shippingCost.toFixed(2) : po.shippingCost),
    otherFees: (typeof po.otherFees === 'number' && po.otherFees === 0) ? '' : (typeof po.otherFees === 'number' ? po.otherFees.toFixed(2) : po.otherFees),
    tax: (typeof po.tax === 'number' && po.tax === 0) ? '' : (typeof po.tax === 'number' ? po.tax.toFixed(2) : po.tax),
    status: po.status,
  }));
  const [saving, setSaving] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Catalogs for all categories
  const [parts, setParts] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [devices, setDevices] = useState([]);
  const [games, setGames] = useState([]);

  // For legacy create modals (can be removed if not used)
  const [showCreateInventory, setShowCreateInventory] = useState(false);
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [pendingLineIndex, setPendingLineIndex] = useState(null);

  useEffect(() => {
    // Load all catalogs for linking
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

  const canEdit = formState.status === 'Created' && userProfile.groupId === po.groupId;
  const canReceive = (po.status === 'Created' || po.status === 'Partially Received');

  const subtotal = formState.lineItems.reduce(
    (sum, li) => sum + (Number(li.quantity) * Number(li.unitPrice || 0)), 0
  );
  const total = subtotal + Number(formState.tax || 0) + Number(formState.shippingCost || 0) + Number(formState.otherFees || 0);

  // ----------- REQUIRED HANDLERS -----------
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
        { description: '', quantity: 1, unitPrice: '', category: 'Part', linkedId: '', quantityReceived: 0 }
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

  // Catalog lookup for display
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

  // For POReceiveModal and CreateInventoryModal and CreatePartModal
  const handleCreatedInventory = (newInv) => {
    setShowCreateInventory(false);
    if (pendingLineIndex !== null) {
      handleLineChange(pendingLineIndex, 'linkedId', newInv.id);
      setPendingLineIndex(null);
    }
    // Add to local state if needed
  };
  const handleCreatedPart = (newPart) => {
    setShowCreatePart(false);
    if (pendingLineIndex !== null) {
      handleLineChange(pendingLineIndex, 'linkedId', newPart.id);
      setPendingLineIndex(null);
    }
    setParts(parts => [...parts, newPart]);
  };

  // Status history
  const statusHistory = po.statusHistory || [];

  const badge = (() => {
    const { color, emoji, label } = statusInfo[formState.status] || { color: "bg-gray-200 text-gray-600", emoji: "❓", label: formState.status };
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 ml-3 text-base font-semibold ${color} border border-gray-200 shadow-sm`}>
        <span className="mr-1 text-lg">{emoji}</span>
        {label}
      </span>
    );
  })();

  // --- Begin render ---
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
        <div className="mb-3 flex gap-4">
          <div className="flex-1">
            <label className="block font-medium mb-1">Vendor</label>
            {editMode ? (
              <input type="text" className={inputClass} value={formState.vendor} onChange={e => setFormState(s => ({...s, vendor: e.target.value}))} required />
            ) : (
              <div>{formState.vendor}</div>
            )}
          </div>
          <div className="w-64">
            <label className="block font-medium mb-1">Order Date</label>
            {editMode ? (
              <input type="date" className={inputClass} value={formState.date} onChange={e => setFormState(s => ({...s, date: e.target.value}))} required />
            ) : (
              <div>{formatFriendlyDate(po.date)}</div>
            )}
          </div>
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Vendor Order #</label>
          {editMode ? (
            <input type="text" className={inputClass} value={formState.vendorOrderNumber} onChange={e => setFormState(s => ({...s, vendorOrderNumber: e.target.value}))} />
          ) : (
            <div>{formState.vendorOrderNumber}</div>
          )}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Notes</label>
          {editMode ? (
            <textarea className={inputClass} value={formState.notes} onChange={e => setFormState(s => ({...s, notes: e.target.value}))} rows={2} />
          ) : (
            <div>{formState.notes}</div>
          )}
        </div>
        {/* Line Items */}
        <div className="mb-3 flex-1 flex flex-col min-h-0">
          <label className="block font-medium mb-2">Line Items</label>
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '40vh' }}>
            <table className="min-w-full border rounded mb-2 text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-center">#</th>
                  <th className="px-2 py-1 text-center">Description</th>
                  <th className="px-2 py-1 text-center">Qty Ordered</th>
                  <th className="px-2 py-1 text-center">Qty Received</th>
                  <th className="px-2 py-1 text-center">Unit Price</th>
                  <th className="px-2 py-1 text-center">Category</th>
                  <th className="px-2 py-1 text-center">Catalog Link</th>
                  {editMode && <th />}
                </tr>
              </thead>
              <tbody>
                {formState.lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="align-middle text-center">{idx + 1}</td>
                    <td className="align-middle text-center">
                      {editMode ? (
                        <input type="text" className={inputClass} value={item.description}
                          onChange={e => handleLineChange(idx, 'description', e.target.value)} required />
                      ) : item.description}
                    </td>
                    <td className="align-middle text-center">
                      {editMode ? (
                        <input type="number" className={inputClass} value={item.quantity}
                          min={1} style={{ width: 60 }}
                          onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                          required />
                      ) : item.quantity}
                    </td>
                    <td className="align-middle text-center">
                      {typeof item.quantityReceived === 'number'
                        ? item.quantityReceived
                        : 0}
                    </td>
                    <td className="align-middle text-center">
                      {editMode ? (
                        <div className={dollarInputWrapper}>
                          <span className={dollarPrefix}>$</span>
                          <input
                            type="text"
                            className={inputClass + " pl-6"}
                            value={item.unitPrice}
                            min={0}
                            step="0.01"
                            style={{ width: 90 }}
                            onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)}
                            onBlur={e => handleLineChange(idx, 'unitPrice', (!e.target.value || isNaN(e.target.value)) ? '' : Number(e.target.value).toFixed(2))}
                            required
                            inputMode="decimal"
                            pattern="^\d+(\.\d{1,2})?$"
                          />
                        </div>
                      ) : (
                        formatMoney(item.unitPrice)
                      )}
                    </td>
                    <td className="align-middle text-center">
                      {editMode ? (
                        <select className={inputClass} value={item.category} onChange={e => handleLineCategoryChange(idx, e.target.value)}>
                          <option value="Part">Part</option>
                          <option value="Accessory">Accessory</option>
                          <option value="Device">Device</option>
                          <option value="Game">Game</option>
                        </select>
                      ) : item.category}
                    </td>
                    <td className="align-middle text-center">
                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <select
                            className={inputClass}
                            value={item.linkedId || ''}
                            onChange={e => handleLineChange(idx, 'linkedId', e.target.value)}
                            required
                          >
                            <option value="" disabled>
                              {item.category === 'Part' && 'Select Part...'}
                              {item.category === 'Accessory' && 'Select Accessory...'}
                              {item.category === 'Device' && 'Select Device...'}
                              {item.category === 'Game' && 'Select Game...'}
                            </option>
                            {getCatalogList(item.category).map(catItem => (
                              <option key={catItem.id} value={catItem.id}>{catItem.name || catItem.id}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm">
                          {item.linkedId
                            ? getLinkedDisplay(item) || <span className="text-red-500">Not linked</span>
                            : <span className="text-red-500">Not linked</span>
                          }
                        </span>
                      )}
                    </td>
                    {editMode &&
                      <td className="align-middle text-center">
                        {formState.lineItems.length > 1 && (
                          <button type="button" className="text-red-500 text-lg px-2"
                            onClick={() => handleRemoveLine(idx)} title="Remove">×</button>
                        )}
                      </td>
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editMode && (
            <button type="button" className="text-indigo-600 hover:underline text-sm"
              onClick={handleAddLine}>+ Add Line Item</button>
          )}
        </div>
        {/* Shipping Cost & Other Fees */}
        <div className="mb-3 flex flex-row gap-4">
          <div className="flex-1">
            <label className="block font-medium mb-1">Shipping Cost</label>
            {editMode ? (
              <div className={dollarInputWrapper}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={formState.shippingCost}
                  min={0}
                  step="0.01"
                  onChange={e => setFormState(s => ({...s, shippingCost: e.target.value}))}
                  onBlur={e => setFormState(s => ({...s, shippingCost: (!e.target.value || isNaN(e.target.value)) ? '' : Number(e.target.value).toFixed(2)}))}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            ) : (
              formatMoney(formState.shippingCost)
            )}
          </div>
          <div className="flex-1">
            <label className="block font-medium mb-1">Other Fees <span className="text-xs text-gray-400">(describe in notes)</span></label>
            {editMode ? (
              <div className={dollarInputWrapper}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={formState.otherFees}
                  min={0}
                  step="0.01"
                  onChange={e => setFormState(s => ({...s, otherFees: e.target.value}))}
                  onBlur={e => setFormState(s => ({...s, otherFees: (!e.target.value || isNaN(e.target.value)) ? '' : Number(e.target.value).toFixed(2)}))}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            ) : (
              formatMoney(formState.otherFees)
            )}
          </div>
        </div>
        {/* Tax + Totals */}
        <div className="mb-3 flex flex-wrap gap-4 justify-end">
          <div>
            <label className="block text-xs text-gray-500">Subtotal</label>
            <div className="font-medium">{formatMoney(subtotal)}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Tax</label>
            {editMode ? (
              <div className={dollarInputWrapper + " w-20"}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={formState.tax}
                  min={0}
                  step="0.01"
                  onChange={e => setFormState(s => ({...s, tax: e.target.value}))}
                  onBlur={e => setFormState(s => ({...s, tax: (!e.target.value || isNaN(e.target.value)) ? '' : Number(e.target.value).toFixed(2)}))}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            ) : (
              <div className="font-medium">{formatMoney(formState.tax)}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500">Total</label>
            <div className="font-bold">{formatMoney(total)}</div>
          </div>
        </div>
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
        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-5">
          {canReceive && (
            <button
              type="button"
              className="px-5 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700"
              onClick={() => setShowReceiveModal(true)}
            >Receive
            </button>
          )}
          {editMode ? (
            <>
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
                onClick={() => { setEditMode(false); setFormState({
                  vendor: po.vendor,
                  vendorOrderNumber: po.vendorOrderNumber || '',
                  date: po.date?.toDate?.().toISOString().substr(0, 10) || '',
                  notes: po.notes || '',
                  lineItems: po.lineItems?.map(li => ({
                    ...li,
                    unitPrice: (typeof li.unitPrice === 'number' && li.unitPrice === 0) ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice)
                  })) || [],
                  shippingCost: (typeof po.shippingCost === 'number' && po.shippingCost === 0) ? '' : (typeof po.shippingCost === 'number' ? po.shippingCost.toFixed(2) : po.shippingCost),
                  otherFees: (typeof po.otherFees === 'number' && po.otherFees === 0) ? '' : (typeof po.otherFees === 'number' ? po.otherFees.toFixed(2) : po.otherFees),
                  tax: (typeof po.tax === 'number' && po.tax === 0) ? '' : (typeof po.tax === 'number' ? po.tax.toFixed(2) : po.tax),
                  status: po.status,
                }); }}
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
      </div>
    </div>
  );
};

export default PODetailModal;