import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import logError from '../../utils/logError';

export default function ShippingCarriersSettings({ groupId }) {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
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
      // Check if it's a permission error
      if (err.code === 'permission-denied') {
        setError('Permission denied: Your account does not have access to shipping carriers. Please check Firestore rules.');
      } else {
        setError(`Failed to load carriers: ${err.message}`);
      }
      
      if (typeof logError === 'function') {
        logError('ShippingCarriers-FetchCarriers', err, { groupId });
      }
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
        createdAt: serverTimestamp() 
      });
      setNewCarrier('');
      fetchCarriers();
    } catch (err) {
      console.error("Error adding carrier:", err);
      // Check if it's a permission error
      if (err.code === 'permission-denied') {
        setError('Permission denied: Your account does not have write access to shipping carriers. Please check Firestore rules.');
      } else {
        setError(`Failed to add carrier: ${err.message}`);
      }
      
      if (typeof logError === 'function') {
        logError('ShippingCarriers-AddCarrier', err, { groupId, carrierName: newCarrier });
      }
    }
  }

  async function deleteCarrier(id) {
    try {
      await deleteDoc(doc(db, 'shipping_carriers', id));
      fetchCarriers();
    } catch (err) {
      console.error("Error deleting carrier:", err);
      if (err.code === 'permission-denied') {
        setError('Permission denied: Your account does not have permission to delete shipping carriers.');
      } else {
        setError(`Failed to delete carrier: ${err.message}`);
      }
      
      if (typeof logError === 'function') {
        logError('ShippingCarriers-DeleteCarrier', err, { groupId, carrierId: id });
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg text-gray-800 dark:text-gray-200">
      <h2 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Shipping Carriers</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}
      
      {groupId ? (
        <>
          <div className="flex gap-2 mb-6">
            <input
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1"
              type="text"
              placeholder="Carrier name (e.g. FedEx, UPS, USPS)"
              value={newCarrier}
              onChange={e => setNewCarrier(e.target.value)}
            />
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors font-medium"
              onClick={addCarrier}
            >
              Add Carrier
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading carriers...</span>
            </div>
          ) : carriers.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {carriers.map(c => (
                <li key={c.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors">
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{c.name}</span>
                  <button 
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20" 
                    onClick={() => deleteCarrier(c.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-400">
                No shipping carriers configured yet. Add your first carrier above.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-amber-600 dark:text-amber-400 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          Group ID is missing. Please make sure you're properly logged in with a valid group.
        </div>
      )}
    </div>
  );
}