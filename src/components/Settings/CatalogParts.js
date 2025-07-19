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
import TrashIcon from '../icons/TrashIcon';
import logError from '../../utils/logError';

const CatalogParts = ({ userProfile, showNotification }) => {
  const [parts, setParts] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newPart, setNewPart] = useState('');
  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [loading, setLoading] = useState(true);
  const [deviceTypesLoading, setDeviceTypesLoading] = useState(true);
  const [brandsLoading, setBrandsLoading] = useState(true);

  // Fetch brands for mapping
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
      },
      (error) => {
        logError('CatalogParts-onSnapshot-brands', error);
        setBrandsLoading(false);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [userProfile?.groupId]);

  // Fetch device types for the dropdown
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setDeviceTypesLoading(true);
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
        setDeviceTypesLoading(false);
        // Auto-select first device type if none selected
        if (typeList.length > 0 && !selectedDeviceType) {
          setSelectedDeviceType(typeList[0].id);
        }
      },
      (error) => {
        logError('CatalogParts-onSnapshot-deviceTypes', error);
        setDeviceTypesLoading(false);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [userProfile?.groupId]);

  // Fetch parts
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setLoading(true);
    const q = query(
      collection(db, 'parts'),
      where('groupId', '==', userProfile.groupId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const partList = [];
        snapshot.forEach((doc) =>
          partList.push({ ...doc.data(), id: doc.id })
        );
        setParts(partList);
        setLoading(false);
      },
      (error) => {
        logError('CatalogParts-onSnapshot', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const handleAddPart = async (e) => {
    e.preventDefault();
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

  // Helper to get device type object by ID
  const getDeviceType = (deviceTypeId) => {
    return deviceTypes.find((dt) => dt.id === deviceTypeId);
  };
  // Helper to get brand name by brandId
  const getBrandName = (brandId) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : 'Unknown Brand';
  };

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleAddPart} className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New part name"
            value={newPart}
            onChange={e => setNewPart(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
            required
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow"
            disabled={deviceTypesLoading || deviceTypes.length === 0}
          >
            Add
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Device Type
          </label>
          <select
            value={selectedDeviceType}
            onChange={e => setSelectedDeviceType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
            required
            disabled={deviceTypesLoading || deviceTypes.length === 0}
          >
            {deviceTypesLoading && (
              <option value="">Loading...</option>
            )}
            {!deviceTypesLoading && deviceTypes.length === 0 && (
              <option value="">No device types available</option>
            )}
            {!deviceTypesLoading && deviceTypes.map((dt) => {
              const brand = brands.find(b => b.id === dt.brandId);
              return (
                <option value={dt.id} key={dt.id}>
                  {dt.name}
                  {brand ? ` (${brand.name})` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </form>
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 shadow p-4">
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading parts...</div>
        ) : parts.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No parts yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {parts.map(part => {
              const deviceType = getDeviceType(part.deviceTypeId);
              const brandName = deviceType ? getBrandName(deviceType.brandId) : 'Unknown Brand';
              return (
                <li key={part.id} className="flex items-center justify-between py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <span className="flex flex-col">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{part.name}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {deviceType ? deviceType.name : 'Unknown Device Type'}
                      {" · "}
                      {brandName}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeletePart(part.id)}
                    className="ml-2 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800 group transition"
                    title="Delete part"
                  >
                    <TrashIcon className="w-5 h-5 text-red-500 group-hover:text-red-700 dark:group-hover:text-red-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CatalogParts;