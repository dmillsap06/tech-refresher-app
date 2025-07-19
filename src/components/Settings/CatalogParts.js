import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import TrashIcon from '../icons/TrashIcon';
import logError from '../../utils/logError';

const CatalogParts = ({ userProfile, showNotification }) => {
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const q = query(collection(db, 'parts'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const partList = [];
      snapshot.forEach(doc => partList.push({ ...doc.data(), id: doc.id }));
      setParts(partList);
      setLoading(false);
    }, (error) => {
      logError('CatalogParts-onSnapshot', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!newPart.trim()) {
      showNotification('Part name cannot be empty.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'parts'), {
        name: newPart.trim(),
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewPart('');
      showNotification('Part added!', 'success');
    } catch (error) {
      logError('CatalogParts-AddPart', error);
      showNotification('Failed to add part.', 'error');
    }
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    try {
      await deleteDoc(doc(db, 'parts', id));
      showNotification('Part deleted.', 'success');
    } catch (error) {
      logError('CatalogParts-DeletePart', error);
      showNotification('Failed to delete part.', 'error');
    }
  };

  return (
    <div>
      <form onSubmit={handleAddPart} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New part name"
          value={newPart}
          onChange={e => setNewPart(e.target.value)}
          className="input"
          required
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add Part
        </button>
      </form>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading parts...</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {parts.map(part => (
            <li key={part.id} className="flex items-center justify-between py-2">
              <span>{part.name}</span>
              <button
                type="button"
                onClick={() => handleDeletePart(part.id)}
                className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800"
                title="Delete part"
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

export default CatalogParts;