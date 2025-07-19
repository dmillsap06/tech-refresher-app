import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import TrashIcon from '../icons/TrashIcon';
import logError from '../../utils/logError';

const CatalogBrands = ({ userProfile, showNotification }) => {
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const q = query(collection(db, 'brands'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const brandList = [];
      snapshot.forEach(doc => brandList.push({ ...doc.data(), id: doc.id }));
      setBrands(brandList);
      setLoading(false);
    }, (error) => {
      logError('CatalogBrands-onSnapshot', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrand.trim()) {
      showNotification('Brand name cannot be empty.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'brands'), {
        name: newBrand.trim(),
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewBrand('');
      showNotification('Brand added!', 'success');
    } catch (error) {
      logError('CatalogBrands-AddBrand', error);
      showNotification('Failed to add brand.', 'error');
    }
  };

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await deleteDoc(doc(db, 'brands', id));
      showNotification('Brand deleted.', 'success');
    } catch (error) {
      logError('CatalogBrands-DeleteBrand', error);
      showNotification('Failed to delete brand.', 'error');
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleAddBrand} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="New brand name"
          value={newBrand}
          onChange={e => setNewBrand(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
          required
        />
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow"
        >
          Add
        </button>
      </form>
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 shadow p-4">
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading brands...</div>
        ) : brands.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No brands yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {brands.map(brand => (
              <li key={brand.id} className="flex items-center justify-between py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <span className="font-medium text-gray-800 dark:text-gray-200">{brand.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteBrand(brand.id)}
                  className="ml-2 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800 group transition"
                  title="Delete brand"
                >
                  <TrashIcon className="w-5 h-5 text-red-500 group-hover:text-red-700 dark:group-hover:text-red-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CatalogBrands;