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
    <div>
      <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="New brand name"
          value={newBrand}
          onChange={e => setNewBrand(e.target.value)}
          className="input"
          required
        />
        <button
          type="submit"
          className="btn-primary"
        >
          Add Brand
        </button>
      </form>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading brands...</div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {brands.map(brand => (
            <li key={brand.id} className="flex items-center justify-between py-2">
              <span>{brand.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteBrand(brand.id)}
                className="ml-2 p-1 rounded hover:bg-red-100 dark:hover:bg-red-800"
                title="Delete brand"
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

export default CatalogBrands;