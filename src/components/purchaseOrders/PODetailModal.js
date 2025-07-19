import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';
import POReceiveModal from './POReceiveModal';
import CreateInventoryModal from './CreateInventoryModal';
import CreatePartModal from './CreatePartModal';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

function formatMoney(val) {
  if (val === '' || isNaN(val)) return '';
  return Number(val).toFixed(2);
}

function formatDate(dt) {
  if (!dt) return '-';
  if (typeof dt === 'string') return new Date(dt).toLocaleString();
  if (dt.toDate) return dt.toDate().toLocaleString();
  return dt.toLocaleString();
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
      unitPrice: li.unitPrice === 0 ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice)
    })) || [],
    shippingCost: po.shippingCost === 0 ? '' : (typeof po.shippingCost === 'number' ? po.shippingCost.toFixed(2) : po.shippingCost),
    otherFees: po.otherFees === 0 ? '' : (typeof po.otherFees === 'number' ? po.otherFees.toFixed(2) : po.otherFees),
    tax: po.tax === 0 ? '' : (typeof po.tax === 'number' ? po.tax.toFixed(2) : po.tax),
    status: po.status,
  }));
  const [saving, setSaving] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Inventory/Parts
  const [inventory, setInventory] = useState([]);
  const [parts, setParts] = useState([]);
  const [showCreateInventory, setShowCreateInventory] = useState(false);
  const [showCreatePart, setShowCreatePart] = useState(false);
  const [pendingLineIndex, setPendingLineIndex] = useState(null);

  useEffect(() => {
    // Load inventory and parts for linking
    const fetchItems = async () => {
      try {
        const invSnap = await getDocs(collection(db, 'inventory'));
        setInventory(invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const partSnap = await getDocs(collection(db, 'parts'));
        setParts(partSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        // fallback: do nothing
      }
    };
    fetchItems();
  }, [showCreateInventory, showCreatePart]);

  // Prevent endless error logging/notifications
  const errorReported = useRef(false);

  const canEdit = formState.status === 'Created' && userProfile.groupId === po.groupId;
  const canReceive = (po.status === 'Created' || po.status === 'Partially Received');

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
          ? { ...item, category: value, inventoryId: '', partId: '' }
          : item
      )
    }));
  };

  const handleAddLine = () => {
    setFormState(state => ({
      ...state,
      lineItems: [
        ...state.lineItems,
        { description: '', quantity: 1, unitPrice: '', category: 'Inventory', notes: '', inventoryId: '', partId: '', quantityReceived: 0 }
      ]
    }));
  };

  const handleRemoveLine = (idx) => {
    setFormState(state => ({
      ...state,
      lineItems: state.lineItems.filter((_, i) => i !== idx)
    }));
  };

  const handleDollarChange = (field) => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    setFormState(state => ({
      ...state,
      [field]: val
    }));
  };

  const handleDollarBlur = (field) => e => {
    let val = e.target.value;
    setFormState(state => ({
      ...state,
      [field]: (!val || isNaN(val)) ? '' : Number(val).toFixed(2)
    }));
  };

  const handleLineDollarChange = (index, field) => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    handleLineChange(index, field, val);
  };

  const handleLineDollarBlur = (index, field) => e => {
    let val = e.target.value;
    handleLineChange(index, field, (!val || isNaN(val)) ? '' : Number(val).toFixed(2));
  };

  const handleInput = field => e => {
    setFormState(state => ({ ...state, [field]: e.target.value }));
  };

  const handleLinkSelect = (idx, value) => {
    setFormState(state => ({
      ...state,
      lineItems: state.lineItems.map((item, i) =>
        i === idx
          ? item.category === 'Inventory'
            ? { ...item, inventoryId: value, partId: '' }
            : { ...item, partId: value, inventoryId: '' }
          : item
      )
    }));
  };

  const handleCreateNew = (idx) => {
    const cat = formState.lineItems[idx].category;
    setPendingLineIndex(idx);
    if (cat === 'Inventory') setShowCreateInventory(true);
    else setShowCreatePart(true);
  };

  // After creating a new inv/part, auto-link it to the pending line
  const handleCreatedInventory = (newInv) => {
    setShowCreateInventory(false);
    if (pendingLineIndex !== null) {
      handleLinkSelect(pendingLineIndex, newInv.id);
      setPendingLineIndex(null);
    }
    setInventory(inv => [...inv, newInv]);
  };
  const handleCreatedPart = (newPart) => {
    setShowCreatePart(false);
    if (pendingLineIndex !== null) {
      handleLinkSelect(pendingLineIndex, newPart.id);
      setPendingLineIndex(null);
    }
    setParts(parts => [...parts, newPart]);
  };

  const saveEdits = async () => {
    setSaving(true);
    errorReported.current = false; // Reset on new attempt
    // Validate all line items are linked
    for (const li of formState.lineItems) {
      if (li.category === 'Inventory' && !li.inventoryId) {
        showNotification('All inventory line items must be linked to an inventory item.', 'error');
        setSaving(false);
        return;
      }
      if (li.category === 'Part' && !li.partId) {
        showNotification('All part line items must be linked to a part.', 'error');
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

  // Render status history if present
  const statusHistory = po.statusHistory || [];

  // Helper: get linked display name
  const getLinkedDisplay = (item) => {
    if (item.category === 'Inventory' && item.inventoryId) {
      const inv = inventory.find(inv => inv.id === item.inventoryId);
      return inv ? (inv.name || inv.id) : item.inventoryId;
    }
    if (item.category === 'Part' && item.partId) {
      const part = parts.find(part => part.id === item.partId);
      return part ? (part.name || part.id) : item.partId;
    }
    return '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-4xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">
          Purchase Order Details
        </h2>
        <div className="mb-3 flex gap-4">
          <div className="flex-1">
            <label className="block font-medium mb-1">Vendor</label>
            {editMode ? (
              <input type="text" className={inputClass} value={formState.vendor} onChange={handleInput('vendor')} required />
            ) : (
              <div>{formState.vendor}</div>
            )}
          </div>
          <div className="w-40">
            <label className="block font-medium mb-1">Date</label>
            {editMode ? (
              <input type="date" className={inputClass} value={formState.date} onChange={handleInput('date')} required />
            ) : (
              <div>{formState.date}</div>
            )}
          </div>
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Vendor Order #</label>
          {editMode ? (
            <input type="text" className={inputClass} value={formState.vendorOrderNumber} onChange={handleInput('vendorOrderNumber')} />
          ) : (
            <div>{formState.vendorOrderNumber}</div>
          )}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Notes</label>
          {editMode ? (
            <textarea className={inputClass} value={formState.notes} onChange={handleInput('notes')} rows={2} />
          ) : (
            <div>{formState.notes}</div>
          )}
        </div>
        {/* Line Items */}
        <div className="mb-3">
          <label className="block font-medium mb-2">Line Items</label>
          <table className="min-w-full border rounded mb-2">
            <thead>
              <tr>
                <th className="px-2 py-1">Description</th>
                <th className="px-2 py-1 text-center">Qty Ordered</th>
                <th className="px-2 py-1 text-center">Qty Received</th>
                <th className="px-2 py-1">Unit Price</th>
                <th className="px-2 py-1">Category</th>
                <th className="px-2 py-1">Inventory/Part Link</th>
                <th className="px-2 py-1">Notes</th>
                {editMode && <th />}
              </tr>
            </thead>
            <tbody>
              {formState.lineItems.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    {editMode ? (
                      <input type="text" className={inputClass} value={item.description}
                        onChange={e => handleLineChange(idx, 'description', e.target.value)} required />
                    ) : item.description}
                  </td>
                  <td className="text-center">
                    {editMode ? (
                      <input type="number" className={inputClass} value={item.quantity}
                        min={1} style={{ width: 60 }}
                        onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                        required />
                    ) : item.quantity}
                  </td>
                  <td className="text-center">
                    {typeof item.quantityReceived === 'number'
                      ? item.quantityReceived
                      : 0}
                  </td>
                  <td>
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
                          onChange={handleLineDollarChange(idx, 'unitPrice')}
                          onBlur={handleLineDollarBlur(idx, 'unitPrice')}
                          required
                          inputMode="decimal"
                          pattern="^\d+(\.\d{1,2})?$"
                        />
                      </div>
                    ) : (
                      `$${formatMoney(item.unitPrice)}`
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <select className={inputClass} value={item.category} onChange={e => handleLineCategoryChange(idx, e.target.value)}>
                        <option value="Inventory">Inventory</option>
                        <option value="Part">Part</option>
                      </select>
                    ) : item.category}
                  </td>
                  <td>
                    {editMode ? (
                      item.category === 'Inventory' ? (
                        <div className="flex items-center gap-1">
                          <select
                            className={inputClass}
                            value={item.inventoryId || ''}
                            onChange={e => handleLinkSelect(idx, e.target.value)}
                            required
                          >
                            <option value="" disabled>Select Inventory...</option>
                            {inventory.map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.name || inv.id}</option>
                            ))}
                            <option value="_create_new">+ Create New...</option>
                          </select>
                          {item.inventoryId === '_create_new' && handleCreateNew(idx)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <select
                            className={inputClass}
                            value={item.partId || ''}
                            onChange={e => handleLinkSelect(idx, e.target.value)}
                            required
                          >
                            <option value="" disabled>Select Part...</option>
                            {parts.map(part => (
                              <option key={part.id} value={part.id}>{part.name || part.id}</option>
                            ))}
                            <option value="_create_new">+ Create New...</option>
                          </select>
                          {item.partId === '_create_new' && handleCreateNew(idx)}
                        </div>
                      )
                    ) : (
                      <span className="text-sm">{getLinkedDisplay(item) || <span className="text-red-500">Not linked</span>}</span>
                    )}
                  </td>
                  <td>
                    {editMode ? (
                      <input type="text" className={inputClass} value={item.notes}
                        onChange={e => handleLineChange(idx, 'notes', e.target.value)} />
                    ) : item.notes}
                  </td>
                  {editMode &&
                    <td>
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
                  onChange={handleDollarChange('shippingCost')}
                  onBlur={handleDollarBlur('shippingCost')}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            ) : (
              `$${formatMoney(formState.shippingCost)}`
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
                  onChange={handleDollarChange('otherFees')}
                  onBlur={handleDollarBlur('otherFees')}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            ) : (
              `$${formatMoney(formState.otherFees)}`
            )}
          </div>
        </div>
        {/* Tax + Totals */}
        <div className="mb-3 flex flex-wrap gap-4 justify-end">
          <div>
            <label className="block text-xs text-gray-500">Subtotal</label>
            <div className="font-medium">${formatMoney(subtotal)}</div>
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
                  onChange={handleDollarChange('tax')}
                  onBlur={handleDollarBlur('tax')}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            ) : (
              <div className="font-medium">${formatMoney(formState.tax)}</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500">Total</label>
            <div className="font-bold">${formatMoney(total)}</div>
          </div>
        </div>
        {/* Status */}
        <div className="mb-3">
          <label className="block font-medium mb-1">Status</label>
          <div>{formState.status}</div>
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
                  <span title={formatDate(entry.at)}>{formatDate(entry.at)}</span>
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
                    unitPrice: li.unitPrice === 0 ? '' : (typeof li.unitPrice === 'number' ? li.unitPrice.toFixed(2) : li.unitPrice)
                  })) || [],
                  shippingCost: po.shippingCost === 0 ? '' : (typeof po.shippingCost === 'number' ? po.shippingCost.toFixed(2) : po.shippingCost),
                  otherFees: po.otherFees === 0 ? '' : (typeof po.otherFees === 'number' ? po.otherFees.toFixed(2) : po.otherFees),
                  tax: po.tax === 0 ? '' : (typeof po.tax === 'number' ? po.tax.toFixed(2) : po.tax),
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