import React, { useState } from 'react';
import usePaymentMethods from './usePaymentMethods';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100";

export default function MarkAsPaidModal({
  open,
  onClose,
  onSave,
  defaultAmount,
  defaultDate,
  loading,
  groupId,
}) {
  const { methods, loading: methodsLoading } = usePaymentMethods(groupId);
  const [datePaid, setDatePaid] = useState(defaultDate || new Date().toISOString().substr(0, 10));
  const [amountPaid, setAmountPaid] = useState(defaultAmount !== undefined ? Number(defaultAmount).toFixed(2) : '');
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  // Filtering/Disabling: Only show methods with active !== false (default is active)
  const selectableMethods = methods.filter(m => m.active !== false);

  const handleSave = () => {
    setTouched(true);
    if (!datePaid || !amountPaid || isNaN(Number(amountPaid)) || !methodId) return;
    const methodObj = selectableMethods.find(m => m.id === methodId);
    if (!methodObj) return;
    onSave({
      datePaid,
      amountPaid: Number(amountPaid),
      method: {
        id: methodObj.id,
        type: methodObj.type,
        nickname: methodObj.nickname,
        lastFour: methodObj.lastFour,
      },
      reference,
      notes,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Mark as Paid</h2>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Date Paid<span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="date"
            className={inputClass}
            value={datePaid}
            onChange={e => setDatePaid(e.target.value)}
          />
          {touched && !datePaid && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Date paid is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Amount Paid<span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={amountPaid}
            onChange={e => setAmountPaid(e.target.value)}
          />
          {touched && (!amountPaid || isNaN(Number(amountPaid))) && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Valid amount is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Payment Method<span className="text-red-500 dark:text-red-400">*</span></label>
          {methodsLoading ? (
            <div className="text-gray-600 dark:text-gray-400">Loading methods...</div>
          ) : (
            <select
              className={inputClass}
              value={methodId}
              onChange={e => setMethodId(e.target.value)}
            >
              <option value="">Select a payment method</option>
              {selectableMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.nickname} ({method.type}{method.lastFour ? `, ****${method.lastFour}` : ''})
                  {method.active === false ? ' [Inactive]' : ''}
                </option>
              ))}
            </select>
          )}
          {touched && !methodId && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Payment method is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Reference / Transaction ID</label>
          <input
            type="text"
            className={inputClass}
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Notes</label>
          <textarea
            className={inputClass}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
            onClick={onClose}
            disabled={loading}
          >Cancel</button>
          <button
            type="button"
            className={`px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 ${loading ? 'opacity-60' : ''}`}
            disabled={loading || !datePaid || !amountPaid || isNaN(Number(amountPaid)) || !methodId}
            onClick={handleSave}
          >{loading ? 'Saving...' : 'Save'}</button>
        </div>
        {/* Optionally show details about the selected method */}
        {methodId && (() => {
          const m = selectableMethods.find(m => m.id === methodId);
          if (!m) return null;
          return (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-300 border-t dark:border-gray-700 pt-2">
              <div className="text-gray-700 dark:text-gray-300">Selected Payment Method:</div>
              <div className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{m.nickname}</span>
                {" "}
                ({m.type}{m.lastFour ? `, ****${m.lastFour}` : ''})
                {m.notes && <span> - {m.notes}</span>}
              </div>
              {m.active === false && (
                <div className="text-red-500 dark:text-red-400">This method is inactive and should not be used for future payments.</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}