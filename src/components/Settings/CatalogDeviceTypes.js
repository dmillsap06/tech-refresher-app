import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import {
TrashIcon,
PencilIcon
} from '../icons';

const CatalogDeviceTypes = ({ userProfile, showNotification }) => {
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newDeviceType, setNewDeviceType] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [loading, setLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch brands for the dropdown
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setBrandsLoading(true);
    const q = query(
      collection(db, 'brands'),
      where('groupId', '==', userProfile.groupId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const brandList = [];
        snapshot.forEach((doc) =>
          brandList.push({ ...doc.data(), id: doc.id })
        );
        setBrands(brandList);
        setBrandsLoading(false);
        // Auto-select first brand if none selected
        if (brandList.length > 0 && !selectedBrand) {
          setSelectedBrand(brandList[0].id);
        }
      },
      (error) => {
        logError('CatalogDeviceTypes-onSnapshot-brands', error);
        setBrandsLoading(false);
        setErrorMsg(error.message || 'Failed to load brands.');
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [userProfile?.groupId]);

  // Fetch device types
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setLoading(true);
    const q = query(
      collection(db, 'deviceTypes'),
      where('groupId', '==', userProfile.groupId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const typeList = [];
        snapshot.forEach((doc) =>
          typeList.push({ ...doc.data(), id: doc.id })
        );
        setDeviceTypes(typeList);
        setLoading(false);
      },
      (error) => {
        logError('CatalogDeviceTypes-onSnapshot', error);
        setLoading(false);
        setErrorMsg(error.message || 'Failed to load device types.');
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddDeviceType = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newDeviceType.trim()) {
      showNotification('Device type name cannot be empty.', 'error');
      return;
    }
    if (!selectedBrand) {
      showNotification('Please select a brand.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'deviceTypes'), {
        name: newDeviceType.trim(),
        brandId: selectedBrand,
        groupId: userProfile.groupId,
        createdAt: new Date(),
      });
      setNewDeviceType('');
      showNotification('Device type added!', 'success');
    } catch (error) {
      logError('CatalogDeviceTypes-AddDeviceType', error);
      setErrorMsg(error.message || 'Failed to add device type.');
      showNotification(error.message || 'Failed to add device type.', 'error');
    }
  };

  const handleDeleteDeviceType = async (id) => {
    setErrorMsg(null);
    if (!window.confirm('Are you sure you want to delete this device type?')) return;
    try {
      await deleteDoc(doc(db, 'deviceTypes', id));
      showNotification('Device type deleted.', 'success');
    } catch (error) {
      logError('CatalogDeviceTypes-DeleteDeviceType', error);
      setErrorMsg(error.message || 'Failed to delete device type.');
      showNotification(error.message || 'Failed to delete device type.', 'error');
    }
  };

  // Helper to get brand name by ID
  const getBrandName = (brandId) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : 'Unknown Brand';
  };

  return (
    <div className="max-w-lg mx-auto">
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded">
          Error: {errorMsg}
        </div>
      )}
      <form onSubmit={handleAddDeviceType} className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New device type"
            value={newDeviceType}
            onChange={(e) => setNewDeviceType(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
            required
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow"
            disabled={brandsLoading || brands.length === 0}
          >
            Add
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Brand
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
            required
            disabled={brandsLoading || brands.length === 0}
          >
            {brandsLoading && (
              <option value="">Loading...</option>
            )}
            {!brandsLoading && brands.length === 0 && (
              <option value="">No brands available</option>
            )}
            {!brandsLoading && brands.map((brand) => (
              <option value={brand.id} key={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </form>
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 shadow p-4">
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading device types...</div>
        ) : deviceTypes.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No device types yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {deviceTypes.map((type) => (
              <li
                key={type.id}
                className="flex items-center justify-between py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {type.name}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {getBrandName(type.brandId)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteDeviceType(type.id)}
                  className="ml-2 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800 group transition"
                  title="Delete device type"
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

export default CatalogDeviceTypes;