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

const CatalogGames = ({ userProfile, showNotification }) => {
  const [games, setGames] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newGame, setNewGame] = useState('');
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceTypesLoading, setDeviceTypesLoading] = useState(true);

  // Fetch brands for mapping
  useEffect(() => {
    if (!userProfile?.groupId) return;
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
      },
      (error) => {
        logError('CatalogGames-onSnapshot-brands', error);
      }
    );
    return () => unsubscribe();
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
      },
      (error) => {
        logError('CatalogGames-onSnapshot-deviceTypes', error);
        setDeviceTypesLoading(false);
      }
    );
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  // Fetch games
  useEffect(() => {
    if (!userProfile?.groupId) return;
    setLoading(true);
    const q = query(
      collection(db, 'games'),
      where('groupId', '==', userProfile.groupId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const gameList = [];
        snapshot.forEach((doc) =>
          gameList.push({ ...doc.data(), id: doc.id })
        );
        setGames(gameList);
        setLoading(false);
      },
      (error) => {
        logError('CatalogGames-onSnapshot', error);
        setLoading(false);
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
    if (!newGame.trim()) {
      showNotification('Game name cannot be empty.', 'error');
      return;
    }
    if (!selectedDeviceTypes.length) {
      showNotification('Please select at least one device type.', 'error');
      return;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'games', editingId), {
          name: newGame.trim(),
          deviceTypeIds: selectedDeviceTypes,
        });
        showNotification('Game updated!', 'success');
      } else {
        await addDoc(collection(db, 'games'), {
          name: newGame.trim(),
          deviceTypeIds: selectedDeviceTypes,
          groupId: userProfile.groupId,
          createdAt: new Date(),
        });
        showNotification('Game added!', 'success');
      }
      setNewGame('');
      setSelectedDeviceTypes([]);
      setEditingId(null);
    } catch (error) {
      logError('CatalogGames-Submit', error);
      showNotification('Failed to save game.', 'error');
    }
  };

  // Handle delete
  const handleDeleteGame = async (id) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    try {
      await deleteDoc(doc(db, 'games', id));
      showNotification('Game deleted.', 'success');
    } catch (error) {
      logError('CatalogGames-DeleteGame', error);
      showNotification('Failed to delete game.', 'error');
    }
  };

  // Start editing
  const handleEdit = (game) => {
    setNewGame(game.name);
    setSelectedDeviceTypes(game.deviceTypeIds || []);
    setEditingId(game.id);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setNewGame('');
    setSelectedDeviceTypes([]);
    setEditingId(null);
  };

  return (
    <div className="max-w-lg mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Game name"
            value={newGame}
            onChange={e => setNewGame(e.target.value)}
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
          <div className="text-gray-500 dark:text-gray-400">Loading games...</div>
        ) : games.length === 0 ? (
          <div className="text-gray-400 text-center py-8">No games yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {games.map(game => (
              <li key={game.id} className="flex items-center justify-between py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <span className="flex flex-col">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{game.name}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {Array.isArray(game.deviceTypeIds) && game.deviceTypeIds.length
                      ? game.deviceTypeIds.map(dtId => {
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
                    onClick={() => handleEdit(game)}
                    className="p-2 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 group transition"
                    title="Edit game"
                  >
                    <PencilIcon className="w-5 h-5 text-indigo-500 group-hover:text-indigo-700 dark:group-hover:text-indigo-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGame(game.id)}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-800 group transition"
                    title="Delete game"
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

export default CatalogGames;