import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const defaultLineItem = { description: '', quantity: 1, unitPrice: 0, category: 'Inventory', notes: '' };

const PurchaseOrderForm = ({ userProfile, onClose, showNotification }) => {
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substr(0, 10));
  const [status] = useState('Open');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState([ { ...defaultLineItem } ]);
  const [tax, setTax] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleLineChange = (index, field, value) => {
    setLineItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAddLine = () => setLineItems(items => [ ...items, { ...defaultLineItem } ]);
  const handleRemoveLine = (index) => setLineItems(items => items.filter((_, i) => i !== index));

  // Calculations
  const subtotal = lineItems.reduce((sum, li) => sum + (Number(li.quantity) * Number(li.unitPrice)), 0);
  const total = subtotal + Number(tax);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const poData = {
        poNumber: '', // You can auto-generate or let Firestore ID serve as PO number
        vendor,
        date: Timestamp.fromDate(new Date(date)),
        status,
        notes,
        groupId: userProfile.groupId,
        lineItems,
        subtotal,
        tax: Number(tax),
        total,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const docRef = await addDoc(collection(db, 'purchase_orders'), poData);
      // Optionally, set poNumber to docRef.id or a custom format here
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">New Purchase Order</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block font-medium mb-1">Vendor</label>
            <input type="text" className="input" value={vendor} onChange={e => setVendor(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Date</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Notes</label>
            <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
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
                    <td><input type="text" className="input" value={item.description} onChange={e => handleLineChange(idx, 'description', e.target.value)} required /></td>
                    <td><input type="number" className="input" value={item.quantity} min={1} style={{width: 60}} onChange={e => handleLineChange(idx, 'quantity', e.target.value)} required /></td>
                    <td><input type="number" className="input" value={item.unitPrice} min={0} step="0.01" style={{width: 90}} onChange={e => handleLineChange(idx, 'unitPrice', e.target.value)} required /></td>
                    <td>
                      <select className="input" value={item.category} onChange={e => handleLineChange(idx, 'category', e.target.value)}>
                        <option value="Inventory">Inventory</option>
                        <option value="Part">Part</option>
                      </select>
                    </td>
                    <td><input type="text" className="input" value={item.notes} onChange={e => handleLineChange(idx, 'notes', e.target.value)} /></td>
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
          <div className="mb-3 flex flex-wrap gap-4 justify-end">
            <div>
              <label className="block text-xs text-gray-500">Subtotal</label>
              <div className="font-medium">${subtotal.toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Tax</label>
              <input type="number" className="input w-20" value={tax} min={0} step="0.01" onChange={e => setTax(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Total</label>
              <div className="font-bold">${total.toFixed(2)}</div>
            </div>
          </div>
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