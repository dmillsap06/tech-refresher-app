import React, { useState, useEffect } from 'react';
import { savePaymentMethod } from './paymentMethodsApi';
import logError from '../../utils/logError';

const typeOptions = [
  { value: '', label: 'Select type' },
  { value: 'Credit Card', label: 'Credit Card' },
  { value: 'ACH', label: 'ACH (Bank Transfer)' },
  { value: 'PayPal', label: 'PayPal' },
  { value: 'Wire Transfer', label: 'Wire Transfer' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Other', label: 'Other' }
];

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100";

export default function EditPaymentMethodModal({ open, onClose, method, groupId }) {
  const [type, setType] = useState('');
  const [nickname, setNickname] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (method) {
      setType(method.type || '');
      setNickname(method.nickname || '');
      setLastFour(method.lastFour || '');
      setNotes(method.notes || '');
      setActive(method.active !== false); // undefined or true means active
    } else {
      setType('');
      setNickname('');
      setLastFour('');
      setNotes('');
      setActive(true);
    }
    setTouched(false);
    setErrorMsg(null);
  }, [method, open]);

  function handleSave() {
    setTouched(true);
    setErrorMsg(null);
    if (!type || !nickname || !lastFour.match(/^\d{4}$/)) return;
    setSaving(true);
    savePaymentMethod(groupId, {
      ...(method ? { id: method.id } : {}),
      type,
      nickname,
      lastFour,
      notes,
      active,
      groupId // <-- Ensure groupId is included in the saved document
    }).then(() => {
      setSaving(false);
      onClose(true);
    }).catch((error) => {
      setSaving(false);
      setErrorMsg(error.message || "Failed to save payment method.");
      logError('EditPaymentMethodModal-Save', error);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">
          {method ? 'Edit Payment Method' : 'Add Payment Method'}
        </h2>
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded">
            Error: {errorMsg}
          </div>
        )}
        <div className="mb-3">
          <label className="block font-medium mb-1">Type<span className="text-red-500">*</span></label>
          <select
            className={inputClass}
            value={type}
            onChange={e => setType(e.target.value)}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {touched && !type && <div className="text-red-600 text-xs mt-1">Type is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Nickname<span className="text-red-500">*</span></label>
          <input
            type="text"
            className={inputClass}
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={40}
          />
          {touched && !nickname && <div className="text-red-600 text-xs mt-1">Nickname is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Last 4 Digits<span className="text-red-500">*</span></label>
          <input
            type="text"
            className={inputClass}
            value={lastFour}
            onChange={e => {
              // Only allow 4 digits
              const val = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
              setLastFour(val);
            }}
            maxLength={4}
            placeholder="e.g. 1234"
          />
          {touched && !lastFour.match(/^\d{4}$/) && <div className="text-red-600 text-xs mt-1">Enter exactly 4 digits.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1">Notes</label>
          <textarea
            className={inputClass}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes or description"
          />
        </div>
        <div className="mb-3 flex items-center">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={e => setActive(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="active" className="font-medium cursor-pointer select-none">
            Active (can be used for new payments)
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400"
            onClick={() => onClose(false)}
            disabled={saving}
          >Cancel</button>
          <button
            type="button"
            className={`px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 ${saving ? 'opacity-60' : ''}`}
            disabled={saving || !type || !nickname || !lastFour.match(/^\d{4}$/)}
            onClick={handleSave}
          >{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}