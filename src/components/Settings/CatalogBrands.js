import React, { useEffect, useState } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import logError from '../../utils/logError';

const CatalogBrands = ({ userProfile, showNotification }) => {
  const [brands, setBrands] = useState([]);
  const [newBrand, setNewBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    const brandsCollectionRef = collection(db, 'brands');
    const q = query(
      brandsCollectionRef,
      where('groupId', '==', userProfile.groupId),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBrands(items);
        setLoading(false);
      },
      (error) => {
        logError('CatalogBrands-onSnapshot', error);
        setErrorMsg("Failed to load brands.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddBrand = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
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
      setErrorMsg(error.message || 'Failed to add brand.');
      showNotification(error.message || 'Failed to add brand.', 'error');
    }
  };

  const handleDeleteBrand = async (id) => {
    setErrorMsg(null);
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await deleteDoc(doc(db, 'brands', id));
      showNotification('Brand deleted.', 'success');
    } catch (error) {
      logError('CatalogBrands-DeleteBrand', error);
      setErrorMsg(error.message || 'Failed to delete brand.');
      showNotification(error.message || 'Failed to delete brand.', 'error');
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-2">Brands Catalog</h3>
      {errorMsg && (
        <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded">
          Error: {errorMsg}
        </div>
      )}
      <form className="flex items-center gap-2 mb-4" onSubmit={handleAddBrand}>
        <input
          className="border rounded px-2 py-1 w-64"
          type="text"
          placeholder="New brand name"
          value={newBrand}
          onChange={e => setNewBrand(e.target.value)}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700"
        >
          Add Brand
        </button>
      </form>
      {loading ? (
        <div>Loading brands...</div>
      ) : (
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Name</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {brands.map(brand => (
              <tr key={brand.id}>
                <td className="px-2 py-1">{brand.name}</td>
                <td className="px-2 py-1">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => handleDeleteBrand(brand.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td colSpan={2} className="text-gray-400 text-center py-2">No brands found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CatalogBrands;