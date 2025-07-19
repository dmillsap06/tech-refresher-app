import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';
import logError from '../../utils/logError';
import CreateInventoryModal from './CreateInventoryModal';
import CreatePartModal from './CreatePartModal';

const defaultLineItem = { description: '', quantity: 1, unitPrice: '', category: 'Inventory', notes: '', inventoryId: '', partId: '' };

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

function formatMoney(val) {
  if (val === '' || isNaN(val)) return '';
  return Number(val).toFixed(2);
}

const PurchaseOrderForm = ({ userProfile, onClose, showNotification }) => {
  const [vendor, setVendor] = useState('');
  const [vendorOrderNumber, setVendorOrderNumber] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substr(0, 10));
  const [status] = useState('Created');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([{ ...defaultLineItem }]);
  const [shippingCost, setShippingCost] = useState('');
  const [otherFees, setOtherFees] = useState('');
  const [tax, setTax] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        logError('PurchaseOrderForm-LoadInventoryParts', err);
        showNotification('Failed to load inventory/parts: ' + err.message, 'error');
      }
    };
    fetchItems();
  }, [showCreateInventory, showCreatePart, showNotification]); // <--- fixed dependency

  const handleLineChange = (index, field, value) => {
    setLineItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleLineCategoryChange = (index, value) => {
    // Reset link fields when switching category
    setLineItems(items =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              category: value,
              inventoryId: '',
              partId: ''
            }
          : item
      )
    );
  };

  const handleAddLine = () => setLineItems(items => [...items, { ...defaultLineItem }]);
  const handleRemoveLine = (index) => setLineItems(items => items.filter((_, i) => i !== index));

  const subtotal = lineItems.reduce((sum, li) =>
    sum + (Number(li.quantity) * Number(li.unitPrice || 0)), 0
  );
  const total = subtotal + Number(tax || 0) + Number(shippingCost || 0) + Number(otherFees || 0);

  // For dollar fields: allow only numbers and one dot, but keep as string for easier typing
  const handleDollarChange = setter => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    setter(val);
  };

  const handleDollarBlur = setter => e => {
    let val = e.target.value;
    if (!val || isNaN(val)) {
      setter('');
      return;
    }
    setter(Number(val).toFixed(2));
  };

  const handleLineDollarChange = (index, field) => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if ((val.match(/\./g) || []).length > 1) return;
    handleLineChange(index, field, val);
  };

  const handleLineDollarBlur = (index, field) => e => {
    let val = e.target.value;
    if (!val || isNaN(val)) {
      handleLineChange(index, field, '');
      return;
    }
    handleLineChange(index, field, Number(val).toFixed(2));
  };

  const handleLinkSelect = (idx, value) => {
    setLineItems(items =>
      items.map((item, i) =>
        i === idx
          ? item.category === 'Inventory'
            ? { ...item, inventoryId: value, partId: '' }
            : { ...item, partId: value, inventoryId: '' }
          : item
      )
    );
  };

  const handleCreateNew = (idx) => {
    const cat = lineItems[idx].category;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Validate all line items are linked
    for (const li of lineItems) {
      if (li.category === 'Inventory' && !li.inventoryId) {
        showNotification('All inventory line items must be linked to an inventory item.', 'error');
        setIsSaving(false);
        return;
      }
      if (li.category === 'Part' && !li.partId) {
        showNotification('All part line items must be linked to a part.', 'error');
        setIsSaving(false);
        return;
      }
    }
    try {
      const poData = {
        poNumber: '',
        vendor,
        vendorOrderNumber,
        date: Timestamp.fromDate(new Date(date)),
        status,
        notes,
        groupId: userProfile.groupId,
        lineItems: lineItems.map(li => ({
          ...li,
          unitPrice: li.unitPrice === '' ? 0 : Number(li.unitPrice),
          quantity: Number(li.quantity),
          quantityReceived: 0 // always start at 0
        })),
        subtotal,
        shippingCost: shippingCost === '' ? 0 : Number(shippingCost),
        otherFees: otherFees === '' ? 0 : Number(otherFees),
        tax: tax === '' ? 0 : Number(tax),
        total,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        statusHistory: [
          {
            status: "Created",
            at: new Date().toISOString(),
            by: userProfile.displayName || userProfile.name || userProfile.email || "Unknown"
          }
        ]
      };
      await addDoc(collection(db, 'purchase_orders'), poData);
      showNotification('Purchase Order created!', 'success');
      onClose();
    } catch (err) {
      logError('PurchaseOrderForm-Submit', err);
      showNotification('Failed to create PO: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-3xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">New Purchase Order</h2>
        <form onSubmit={handleSubmit}>
          {/* Vendor + Date Row */}
          <div className="flex gap-4 mb-3">
            <div className="flex-1">
              <label className="block font-medium mb-1">Vendor</label>
              <input type="text" className={inputClass} value={vendor} onChange={e => setVendor(e.target.value)} required />
            </div>
            <div className="w-40">
              <label className="block font-medium mb-1">Date</label>
              <input type="date" className={inputClass} value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>
          {/* Vendor Order # */}
          <div className="mb-3">
            <label className="block font-medium mb-1">Vendor Order #</label>
            <input type="text" className={inputClass} value={vendorOrderNumber} onChange={e => setVendorOrderNumber(e.target.value)} />
          </div>
          {/* Notes */}
          <div className="mb-3">
            <label className="block font-medium mb-1">Notes</label>
            <textarea className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Add notes or explain 'Other Fees' here..." />
          </div>
          {/* Line Items */}
          <div className="mb-3">
            <label className="block font-medium mb-2">Line Items</label>
            <table className="min-w-full border rounded mb-2">
              <thead>
                <tr>
                  <th className="px-2 py-1">Description</th>
                  <th className="px-2 py-1">Qty</th>
                  <th className="px-2 py-1">Unit Price</th>
                  <th className="px-2 py-1">Category</th>
                  <th className="px-2 py-1">Inventory/Part Link</th>
                  <th className="px-2 py-1">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input type="text" className={inputClass} value={item.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} required />
                    </td>
                    <td>
                      <input type="number" className={inputClass} value={item.quantity} min={1} style={{ width: 60 }} onChange={e => handleLineChange(idx, 'quantity', e.target.value)} required />
                    </td>
                    <td>
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
                    </td>
                    <td>
                      <select className={inputClass} value={item.category} onChange={e => handleLineCategoryChange(idx, e.target.value)}>
                        <option value="Inventory">Inventory</option>
                        <option value="Part">Part</option>
                      </select>
                    </td>
                    <td>
                      {item.category === 'Inventory' ? (
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
                      )}
                    </td>
                    <td>
                      <input type="text" className={inputClass} value={item.notes} onChange={e => handleLineChange(idx, 'notes', e.target.value)} />
                    </td>
                    <td>
                      {lineItems.length > 1 && (
                        <button type="button" className="text-red-500 text-lg px-2" onClick={() => handleRemoveLine(idx)} title="Remove">×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="text-indigo-600 hover:underline text-sm" onClick={handleAddLine}>+ Add Line Item</button>
          </div>
          {/* Shipping Cost & Other Fees */}
          <div className="mb-3 flex flex-row gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">Shipping Cost</label>
              <div className={dollarInputWrapper}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={shippingCost}
                  min={0}
                  step="0.01"
                  onChange={handleDollarChange(setShippingCost)}
                  onBlur={handleDollarBlur(setShippingCost)}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1">Other Fees <span className="text-xs text-gray-400">(describe in notes)</span></label>
              <div className={dollarInputWrapper}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={otherFees}
                  min={0}
                  step="0.01"
                  onChange={handleDollarChange(setOtherFees)}
                  onBlur={handleDollarBlur(setOtherFees)}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
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
              <div className={dollarInputWrapper + " w-20"}>
                <span className={dollarPrefix}>$</span>
                <input
                  type="text"
                  className={inputClass + " pl-6"}
                  value={tax}
                  min={0}
                  step="0.01"
                  onChange={handleDollarChange(setTax)}
                  onBlur={handleDollarBlur(setTax)}
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Total</label>
              <div className="font-bold">${formatMoney(total)}</div>
            </div>
          </div>
          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Purchase Order"}
            </button>
          </div>
        </form>
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

export default PurchaseOrderForm;