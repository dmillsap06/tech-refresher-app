import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import logError from '../../utils/logError';

export default function ShippingCarriersSettings({ groupId }) {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCarrier, setNewCarrier] = useState('');
  const [error, setError] = useState('');

  const fetchCarriers = async () => {
    if (!groupId) {
      setError('No group ID provided. Cannot load carriers.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log(`Fetching carriers for group ID: ${groupId}`);
      const q = query(collection(db, 'shipping_carriers'), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      
      const carriersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`Found ${carriersList.length} carriers for group ${groupId}`);
      setCarriers(carriersList);
    } catch (err) {
      console.error("Error fetching carriers:", err);
      if (logError) {
        logError('ShippingCarriers-FetchCarriers', err, { groupId });
      }
      setError(`Failed to load carriers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchCarriers();
    // eslint-disable-next-line
  }, [groupId]);

  async function addCarrier() {
    setError('');
    if (!newCarrier.trim()) {
      setError('Carrier name cannot be empty');
      return;
    }
    
    if (!groupId) {
      setError('No group ID available. Cannot add carrier.');
      return;
    }
    
    try {
      await addDoc(collection(db, 'shipping_carriers'), { 
        name: newCarrier.trim(), 
        groupId,
        createdAt: new Date() 
      });
      setNewCarrier('');
      fetchCarriers();
    } catch (err) {
      console.error("Error adding carrier:", err);
      if (logError) {
        logError('ShippingCarriers-AddCarrier', err, { groupId, carrierName: newCarrier });
      }
      setError(`Failed to add carrier: ${err.message}`);
    }
  }

  async function deleteCarrier(id) {
    try {
      await deleteDoc(doc(db, 'shipping_carriers', id));
      fetchCarriers();
    } catch (err) {
      console.error("Error deleting carrier:", err);
      if (logError) {
        logError('ShippingCarriers-DeleteCarrier', err, { groupId, carrierId: id });
      }
      setError(`Failed to delete carrier: ${err.message}`);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-gray-800 dark:text-gray-200">
      <h2 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Shipping Carriers</h2>
      {groupId ? (
        <>
          <div className="flex gap-2 mb-4">
            <input
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              type="text"
              placeholder="Carrier name (e.g. FedEx)"
              value={newCarrier}
              onChange={e => setNewCarrier(e.target.value)}
            />
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded transition-colors" 
              onClick={addCarrier}
            >
              Add
            </button>
          </div>
          {error && <div className="text-red-600 dark:text-red-400 mb-2">{error}</div>}
          <ul className="space-y-2">
            {loading ? (
              <li className="text-gray-600 dark:text-gray-400">Loading carriers...</li>
            ) : carriers.length > 0 ? (
              carriers.map(c => (
                <li key={c.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-800 dark:text-gray-200">{c.name}</span>
                  <button 
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors" 
                    onClick={() => deleteCarrier(c.id)}
                  >
                    Delete
                  </button>
                </li>
              ))
            ) : (
              <li className="text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700 rounded">
                No shipping carriers configured yet. Add your first carrier above.
              </li>
            )}
          </ul>
        </>
      ) : (
        <div className="text-amber-600 dark:text-amber-400 p-4 bg-amber-50 dark:bg-amber-900/20 rounded">
          Group ID is missing. Please make sure you're properly logged in with a valid group.
        </div>
      )}
    </div>
  );
}