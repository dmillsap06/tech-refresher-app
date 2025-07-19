import React, { useEffect, useState } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const CatalogParts = ({ userProfile, showNotification }) => {
  const [parts, setParts] = useState([]);
  const [newPart, setNewPart] = useState('');
  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    const partsCollectionRef = collection(db, 'parts');
    const q = query(
      partsCollectionRef,
      where('groupId', '==', userProfile.groupId),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParts(items);
        setLoading(false);
      },
      (error) => {
        logError('CatalogParts-onSnapshot', error);
        setErrorMsg(error.message || "Failed to load parts.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  useEffect(() => {
    const deviceTypesRef = collection(db, 'deviceTypes');
    const unsubscribe = onSnapshot(
      deviceTypesRef,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDeviceTypes(items);
      },
      (error) => {
        logError('CatalogParts-DeviceTypes', error);
        setErrorMsg(error.message || "Failed to load device types.");
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddPart = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newPart.trim()) {
      showNotification('Part name cannot be empty.', 'error');
      return;
    }
    if (!selectedDeviceType) {
      showNotification('Please select a device type.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'parts'), {
        name: newPart.trim(),
        deviceTypeId: selectedDeviceType,
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewPart('');
      showNotification('Part added!', 'success');
    } catch (error) {
      logError('CatalogParts-AddPart', error);
      setErrorMsg(error.message || 'Failed to add part.');
      showNotification(error.message || 'Failed to add part.', 'error');
    }
  };

  const handleDeletePart = async (id) => {
    setErrorMsg(null);
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    try {
      await deleteDoc(doc(db, 'parts', id));
      showNotification('Part deleted.', 'success');
    } catch (error) {
      logError('CatalogParts-DeletePart', error);
      setErrorMsg(error.message || 'Failed to delete part.');
      showNotification(error.message || 'Failed to delete part.', 'error');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Parts Catalog</h3>
      {errorMsg && (
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded">
          Error: {errorMsg}
        </div>
      )}
      <form className="flex items-center gap-2 mb-4" onSubmit={handleAddPart}>
        <input
          className="border rounded px-2 py-1 w-64"
          type="text"
          placeholder="New part name"
          value={newPart}
          onChange={e => setNewPart(e.target.value)}
        />
        <select
          className="border rounded px-2 py-1"
          value={selectedDeviceType}
          onChange={e => setSelectedDeviceType(e.target.value)}
        >
          <option value="">Select Device Type</option>
          {deviceTypes.map(dt => (
            <option key={dt.id} value={dt.id}>{dt.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
        >
          Add Part
        </button>
      </form>
      {loading ? (
        <div>Loading parts...</div>
      ) : (
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1 text-left">Device Type</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {parts.map(part => (
              <tr key={part.id}>
                <td className="px-2 py-1">{part.name}</td>
                <td className="px-2 py-1">
                  {deviceTypes.find(dt => dt.id === part.deviceTypeId)?.name || part.deviceTypeId}
                </td>
                <td className="px-2 py-1">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDeletePart(part.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {parts.length === 0 && (
              <tr>
                <td colSpan={3} className="text-gray-400 text-center py-2">No parts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CatalogParts;