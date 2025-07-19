import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";

const CreatePartModal = ({ userProfile, onCreated, onClose, showNotification }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'parts'), {
        name,
        sku,
        description,
        groupId: userProfile.groupId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        stock: 0
      });
      onCreated({
        id: docRef.id,
        name,
        sku,
        description,
        groupId: userProfile.groupId
      });
      showNotification('Part created!', 'success');
    } catch (err) {
      logError('CreatePartModal-handleSubmit', err);
      showNotification('Failed to create part: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Create Part</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block font-medium mb-1">Name</label>
            <input type="text" className={inputClass} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">SKU</label>
            <input type="text" className={inputClass} value={sku} onChange={e => setSku(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Description</label>
            <textarea className={inputClass} value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button type="button" className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700" disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePartModal;