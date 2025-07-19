import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import TrashIcon from '../icons/TrashIcon';
import PencilIcon from '../icons/PencilIcon';
import logError from '../../utils/logError';

const CatalogAccessories = ({ userProfile, showNotification }) => {
  const [accessories, setAccessories] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newAccessory, setNewAccessory] = useState('');
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceTypesLoading, setDeviceTypesLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch brands
  useEffect(() => {
    if (!userProfile?.groupId) return;
    const q = query(collection(db, 'brands'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const brandList = [];
        snapshot.forEach((doc) => brandList.push({ ...doc.data(), id: doc.id }));
        setBrands(brandList);
      },
      (error) => {
        logError('CatalogAccessories-onSnapshot-brands', error);
        setErrorMsg(error.message || 'Failed to load brands.');
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  // Fetch device types for dropdown
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setDeviceTypesLoading(true);
    const q = query(collection(db, 'deviceTypes'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const typeList = [];
        snapshot.forEach((doc) => typeList.push({ ...doc.data(), id: doc.id }));
        setDeviceTypes(typeList);
        setDeviceTypesLoading(false);
      },
      (error) => {
        logError('CatalogAccessories-onSnapshot-deviceTypes', error);
        setDeviceTypesLoading(false);
        setErrorMsg(error.message || 'Failed to load device types.');
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  // Fetch accessories
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setLoading(true);
    const q = query(collection(db, 'accessories'), where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accessoryList = [];
        snapshot.forEach((doc) => accessoryList.push({ ...doc.data(), id: doc.id }));
        setAccessories(accessoryList);
        setLoading(false);
      },
      (error) => {
        logError('CatalogAccessories-onSnapshot', error);
        setLoading(false);
        setErrorMsg(error.message || 'Failed to load accessories.');
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  // Helper to get device type object by ID
  const getDeviceType = (deviceTypeId) => {
    return deviceTypes.find((dt) => dt.id === deviceTypeId);
  };

  // Helper to get brand name by brandId
  const getBrandName = (brandId) => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? brand.name : 'Unknown Brand';
  };

  // Handle multi-select change
  const handleDeviceTypeChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
    setSelectedDeviceTypes(selected);
  };

  // Handle add or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newAccessory.trim()) {
      showNotification('Accessory name cannot be empty.', 'error');
      return;
    }
    if (!selectedDeviceTypes.length) {
      showNotification('Please select at least one device type.', 'error');
      return;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'accessories', editingId), {
          name: newAccessory.trim(),
          deviceTypeIds: selectedDeviceTypes,
        });
        showNotification('Accessory updated!', 'success');
      } else {
        await addDoc(collection(db, 'accessories'), {
          name: newAccessory.trim(),
          deviceTypeIds: selectedDeviceTypes,
          groupId: userProfile.groupId,
          createdAt: new Date(),
        });
        showNotification('Accessory added!', 'success');
      }
      setNewAccessory('');
      setSelectedDeviceTypes([]);
      setEditingId(null);
    } catch (error) {
      logError('CatalogAccessories-Submit', error);
      setErrorMsg(error.message || 'Failed to save accessory.');
      showNotification(error.message || 'Failed to save accessory.', 'error');
    }
  };

  // Handle delete
  const handleDeleteAccessory = async (id) => {
    setErrorMsg(null);
    if (!window.confirm('Are you sure you want to delete this accessory?')) return;
    try {
      await deleteDoc(doc(db, 'accessories', id));
      showNotification('Accessory deleted.', 'success');
    } catch (error) {
      logError('CatalogAccessories-DeleteAccessory', error);
      setErrorMsg(error.message || 'Failed to delete accessory.');
      showNotification(error.message || 'Failed to delete accessory.', 'error');
    }
  };

  // Start editing
  const handleEdit = (accessory) => {
    setNewAccessory(accessory.name);
    setSelectedDeviceTypes(accessory.deviceTypeIds || []);
    setEditingId(accessory.id);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setNewAccessory('');
    setSelectedDeviceTypes([]);
    setEditingId(null);
  };

  return (
    <div className="max-w-lg mx-auto">
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded">
          Error: {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Accessory name"
            value={newAccessory}
            onChange={e => setNewAccessory(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
            required
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow"
            disabled={deviceTypesLoading || deviceTypes.length === 0}
          >
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-5 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white ml-2"
            >
              Cancel
            </button>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Compatible Device Types
          </label>
          <select
            multiple
            value={selectedDeviceTypes}
            onChange={handleDeviceTypeChange}
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 shadow-sm transition"
            required
            disabled={deviceTypesLoading || deviceTypes.length === 0}
            size={Math.min(deviceTypes.length, 6)}
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
          <div className="text-xs text-gray-500 mt-1">Ctrl-Click to select multiple</div>
        </div>
      </form>
      <div className="rounded-xl bg-gray-50 dark:bg-gray-800 shadow p-4">
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading accessories...</div>
        ) : accessories.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No accessories yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {accessories.map(accessory => (
              <li key={accessory.id} className="flex items-center justify-between py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <span className="flex flex-col">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{accessory.name}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {Array.isArray(accessory.deviceTypeIds) && accessory.deviceTypeIds.length
                      ? accessory.deviceTypeIds.map(dtId => {
                          const dt = getDeviceType(dtId);
                          const brand = dt ? getBrandName(dt.brandId) : null;
                          return dt
                            ? `${dt.name}${brand ? ` (${brand})` : ''}`
                            : 'Unknown Device Type';
                        }).join(', ')
                      : 'No device types'}
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(accessory)}
                    className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 group transition"
                    title="Edit accessory"
                  >
                    <PencilIcon className="w-5 h-5 text-indigo-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccessory(accessory.id)}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800 group transition"
                    title="Delete accessory"
                  >
                    <TrashIcon className="w-5 h-5 text-red-500 group-hover:text-red-700 dark:group-hover:text-red-300" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CatalogAccessories;