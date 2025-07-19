import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import TrashIcon from '../icons/TrashIcon';
import logError from '../../utils/logError';

const CatalogDeviceTypes = ({ userProfile, showNotification }) => {
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [newDeviceType, setNewDeviceType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const q = query(collection(db, 'deviceTypes'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typeList = [];
      snapshot.forEach(doc => typeList.push({ ...doc.data(), id: doc.id }));
      setDeviceTypes(typeList);
      setLoading(false);
    }, (error) => {
      logError('CatalogDeviceTypes-onSnapshot', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddDeviceType = async (e) => {
    e.preventDefault();
    if (!newDeviceType.trim()) {
      showNotification('Device type name cannot be empty.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'deviceTypes'), {
        name: newDeviceType.trim(),
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewDeviceType('');
      showNotification('Device type added!', 'success');
    } catch (error) {
      logError('CatalogDeviceTypes-AddDeviceType', error);
      showNotification('Failed to add device type.', 'error');
    }
  };

  const handleDeleteDeviceType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this device type?')) return;
    try {
      await deleteDoc(doc(db, 'deviceTypes', id));
      showNotification('Device type deleted.', 'success');
    } catch (error) {
      logError('CatalogDeviceTypes-DeleteDeviceType', error);
      showNotification('Failed to delete device type.', 'error');
    }
  };

  return (
    <div>
      <form onSubmit={handleAddDeviceType} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New device type"
          value={newDeviceType}
          onChange={e => setNewDeviceType(e.target.value)}
          className="input"
          required
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add Device Type
        </button>
      </form>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading device types...</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {deviceTypes.map(type => (
            <li key={type.id} className="flex items-center justify-between py-2">
              <span>{type.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteDeviceType(type.id)}
                className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800"
                title="Delete device type"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CatalogDeviceTypes;