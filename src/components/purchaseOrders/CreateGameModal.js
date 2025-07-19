import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const inputClass =
  "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100 w-full";

const CreateGameModal = ({ userProfile, onCreated, onClose, showNotification }) => {
  const [name, setName] = useState('');
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [originalDeviceType, setOriginalDeviceType] = useState('');
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeviceTypes = async () => {
      if (!userProfile?.groupId) return;
      try {
        const q = query(collection(db, 'deviceTypes'), where('groupId', '==', userProfile.groupId));
        const snap = await getDocs(q);
        setDeviceTypes(
          snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        );
      } catch (err) {
        setError('Failed to load device types: ' + err.message);
        logError('CreateGameModal-fetchDeviceTypes', err);
        showNotification('Failed to load device types: ' + err.message, 'error');
      }
    };
    fetchDeviceTypes();
  }, [userProfile?.groupId, showNotification]);

  // When original device type changes, optionally add it to compatible types
  const handleOriginalDeviceTypeChange = (e) => {
    setOriginalDeviceType(e.target.value);
    if (e.target.value && !selectedDeviceTypes.includes(e.target.value)) {
      setSelectedDeviceTypes(prev => [...prev, e.target.value]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      showNotification('Game name cannot be empty.', 'error');
      return;
    }
    if (!originalDeviceType) {
      showNotification('Please select an original device type.', 'error');
      return;
    }
    if (!selectedDeviceTypes.length) {
      showNotification('Please select at least one compatible device type.', 'error');
      return;
    }
    // Ensure original device type is in compatible
    let compatibleDeviceTypes = selectedDeviceTypes;
    if (!compatibleDeviceTypes.includes(originalDeviceType)) {
      compatibleDeviceTypes = [...compatibleDeviceTypes, originalDeviceType];
    }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'games'), {
        name,
        originalDeviceTypeId: originalDeviceType,
        deviceTypeIds: compatibleDeviceTypes,
        groupId: userProfile.groupId,
        createdAt: Timestamp.now()
      });
      onCreated({
        id: docRef.id,
        name,
        originalDeviceTypeId: originalDeviceType,
        deviceTypeIds: compatibleDeviceTypes,
        groupId: userProfile.groupId
      });
      showNotification('Game created!', 'success');
    } catch (err) {
      setError('Failed to create game: ' + err.message);
      logError('CreateGameModal-handleSubmit', err);
      showNotification('Failed to create game: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Create Game</h2>
        {error && (
          <div className="mb-3 text-red-600 bg-red-100 dark:bg-red-900/50 p-2 rounded">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block font-medium mb-1">Name</label>
            <input type="text" className={inputClass} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Original Device Type</label>
            <select
              className={inputClass}
              value={originalDeviceType}
              onChange={handleOriginalDeviceTypeChange}
              required
            >
              <option value="">Select original device type...</option>
              {deviceTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Compatible Device Types</label>
            <select
              multiple
              className={inputClass}
              value={selectedDeviceTypes}
              onChange={e => setSelectedDeviceTypes(Array.from(e.target.selectedOptions, option => option.value))}
              size={Math.min(deviceTypes.length, 6)}
              required
            >
              {deviceTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
            </select>
            <div className="text-xs text-gray-500 mt-1">Ctrl/Cmd+click to select multiple</div>
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

export default CreateGameModal;