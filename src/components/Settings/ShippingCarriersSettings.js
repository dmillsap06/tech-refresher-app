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

export default function ShippingCarriersSettings({ groupId }) {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCarrier, setNewCarrier] = useState('');
  const [error, setError] = useState('');

  const fetchCarriers = async () => {
    setLoading(true);
    const q = query(collection(db, 'shipping_carriers'), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    setCarriers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
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
    await addDoc(collection(db, 'shipping_carriers'), { name: newCarrier.trim(), groupId });
    setNewCarrier('');
    fetchCarriers();
  }

  async function deleteCarrier(id) {
    await deleteDoc(doc(db, 'shipping_carriers', id));
    fetchCarriers();
  }

  return (
    <div>
      <h2 className="font-bold text-lg mb-2">Shipping Carriers</h2>
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-2 py-1"
          type="text"
          placeholder="Carrier name (e.g. FedEx)"
          value={newCarrier}
          onChange={e => setNewCarrier(e.target.value)}
        />
        <button className="bg-indigo-600 text-white px-3 py-1 rounded" onClick={addCarrier}>
          Add
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <ul>
        {loading
          ? <li>Loading...</li>
          : carriers.map(c => (
            <li key={c.id} className="flex items-center gap-2 mb-1">
              <span>{c.name}</span>
              <button className="text-red-500" onClick={() => deleteCarrier(c.id)}>
                Delete
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}