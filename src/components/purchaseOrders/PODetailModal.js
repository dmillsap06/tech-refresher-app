import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";
const dollarInputWrapper = "relative";
const dollarPrefix = "absolute left-2 inset-y-0 flex items-center text-gray-400 pointer-events-none";

function formatMoney(val) {
  if (val === '' || isNaN(val)) return '';
  return Number(val).toFixed(2);
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

  const handleAddLine = () => {
    setFormState(state => ({
      ...state,
      lineItems: [...state.lineItems, { description: '', quantity: 1, unitPrice: '', category: 'Inventory', notes: '' }]
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

  const saveEdits = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'purchase_orders', po.id), {
        vendor: formState.vendor,
        vendorOrderNumber: formState.vendorOrderNumber,
        date: new Date(formState.date),
        notes: formState.notes,
        lineItems: formState.lineItems.map(li => ({
          ...li,
          unitPrice: li.unitPrice === '' ? 0 : Number(li.unitPrice),
          quantity: Number(li.quantity)
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
      logError('PODetailModal-Update', err);
      showNotification('Failed to update PO: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-3xl relative">
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
                <th className="px-2 py-1">Qty</th>
                <th className="px-2 py-1">Unit Price</th>
                <th className="px-2 py-1">Category</th>
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
                  <td>
                    {editMode ? (
                      <input type="number" className={inputClass} value={item.quantity}
                        min={1} style={{ width: 60 }}
                        onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                        required />
                    ) : item.quantity}
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
                      <select className={inputClass} value={item.category}
                        onChange={e => handleLineChange(idx, 'category', e.target.value)}>
                        <option value="Inventory">Inventory</option>
                        <option value="Part">Part</option>
                      </select>
                    ) : item.category}
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
        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-5">
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
      </div>
    </div>
  );
};

export default PODetailModal;