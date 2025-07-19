import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import TrashIcon from '../icons/TrashIcon';
import logError from '../../utils/logError';

const CatalogAccessories = ({ userProfile, showNotification }) => {
  const [accessories, setAccessories] = useState([]);
  const [newAccessory, setNewAccessory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const q = query(collection(db, 'accessories'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accessoryList = [];
      snapshot.forEach(doc => accessoryList.push({ ...doc.data(), id: doc.id }));
      setAccessories(accessoryList);
      setLoading(false);
    }, (error) => {
      logError('CatalogAccessories-onSnapshot', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddAccessory = async (e) => {
    e.preventDefault();
    if (!newAccessory.trim()) {
      showNotification('Accessory name cannot be empty.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'accessories'), {
        name: newAccessory.trim(),
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewAccessory('');
      showNotification('Accessory added!', 'success');
    } catch (error) {
      logError('CatalogAccessories-AddAccessory', error);
      showNotification('Failed to add accessory.', 'error');
    }
  };

  const handleDeleteAccessory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this accessory?')) return;
    try {
      await deleteDoc(doc(db, 'accessories', id));
      showNotification('Accessory deleted.', 'success');
    } catch (error) {
      logError('CatalogAccessories-DeleteAccessory', error);
      showNotification('Failed to delete accessory.', 'error');
    }
  };

  return (
    <div>
      <form onSubmit={handleAddAccessory} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New accessory name"
          value={newAccessory}
          onChange={e => setNewAccessory(e.target.value)}
          className="input"
          required
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add Accessory
        </button>
      </form>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading accessories...</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {accessories.map(accessory => (
            <li key={accessory.id} className="flex items-center justify-between py-2">
              <span>{accessory.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteAccessory(accessory.id)}
                className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800"
                title="Delete accessory"
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

export default CatalogAccessories;