import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const defaultLineItem = { description: '', quantity: 1, unitPrice: 0, category: 'Inventory', notes: '' };

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none";

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
  const [shippingCost, setShippingCost] = useState(0);
  const [otherFees, setOtherFees] = useState(0);
  const [tax, setTax] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleLineChange = (index, field, value) => {
    setLineItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAddLine = () => setLineItems(items => [...items, { ...defaultLineItem }]);
  const handleRemoveLine = (index) => setLineItems(items => items.filter((_, i) => i !== index));

  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) * Number(li.unitPrice)), 0);
  const total = subtotal + Number(tax) + Number(shippingCost) + Number(otherFees);

  const handleNumberInput = setter => e => {
    // Allow only valid number input, always with 2 decimals
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if (val === '' || isNaN(val)) {
      setter('');
      return;
    }
    setter(parseFloat(val));
  };

  const handleMoneyBlur = setter => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if (val === '' || isNaN(val)) {
      setter(0);
      return;
    }
    setter(Number(parseFloat(val).toFixed(2)));
  };

  const handleLineMoneyInput = (index, field) => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if (val === '' || isNaN(val)) {
      handleLineChange(index, field, '');
      return;
    }
    handleLineChange(index, field, parseFloat(val));
  };

  const handleLineMoneyBlur = (index, field) => e => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    if (val === '' || isNaN(val)) {
      handleLineChange(index, field, 0);
      return;
    }
    handleLineChange(index, field, Number(parseFloat(val).toFixed(2)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const poData = {
        poNumber: '', // Optionally set later
        vendor,
        vendorOrderNumber,
        date: Timestamp.fromDate(new Date(date)),
        status,
        notes,
        groupId: userProfile.groupId,
        lineItems,
        subtotal,
        shippingCost: Number(shippingCost),
        otherFees: Number(otherFees),
        tax: Number(tax),
        total,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await addDoc(collection(db, 'purchase_orders'), poData);
      showNotification('Purchase Order created!', 'success');
      onClose();
    } catch (err) {
      showNotification('Failed to create PO: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-4xl relative"> {/* Modal is bigger */}
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
                          type="number"
                          className={inputClass + " pl-6"}
                          value={item.unitPrice === '' ? '' : formatMoney(item.unitPrice)}
                          min={0}
                          step="0.01"
                          style={{ width: 90 }}
                          onChange={handleLineMoneyInput(idx, 'unitPrice')}
                          onBlur={handleLineMoneyBlur(idx, 'unitPrice')}
                          required
                          inputMode="decimal"
                          pattern="^\d+(\.\d{1,2})?$"
                        />
                      </div>
                    </td>
                    <td>
                      <select className={inputClass} value={item.category} onChange={e => handleLineChange(idx, 'category', e.target.value)}>
                        <option value="Inventory">Inventory</option>
                        <option value="Part">Part</option>
                      </select>
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
                  type="number"
                  className={inputClass + " pl-6"}
                  value={shippingCost === '' ? '' : formatMoney(shippingCost)}
                  min={0}
                  step="0.01"
                  onChange={handleNumberInput(setShippingCost)}
                  onBlur={handleMoneyBlur(setShippingCost)}
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
                  type="number"
                  className={inputClass + " pl-6"}
                  value={otherFees === '' ? '' : formatMoney(otherFees)}
                  min={0}
                  step="0.01"
                  onChange={handleNumberInput(setOtherFees)}
                  onBlur={handleMoneyBlur(setOtherFees)}
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
                  type="number"
                  className={inputClass + " pl-6"}
                  value={tax === '' ? '' : formatMoney(tax)}
                  min={0}
                  step="0.01"
                  onChange={handleNumberInput(setTax)}
                  onBlur={handleMoneyBlur(setTax)}
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
      </div>
    </div>
  );
};

export default PurchaseOrderForm;