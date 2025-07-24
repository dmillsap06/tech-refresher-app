import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import logError from '../../utils/logError';
import InventoryForm from './InventoryForm';
import PartsSurveyModal from './PartsSurveyModal';
import Modal from '../common/Modal'; // Import the reusable Modal

// --- Icon Components (to be moved later) ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 hover:text-blue-700" viewBox="0 0 20 20" fill="currentColor">
    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
  </svg>
);

const ArchiveBoxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 hover:text-red-700" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
        <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const InventoryPage = ({ onBack, showNotification }) => {
    const [inventory, setInventory] = useState([]);
    const [filteredInventory, setFilteredInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPartsSurvey, setShowPartsSurvey] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [deviceConfig, setDeviceConfig] = useState({});

    useEffect(() => {
        setIsLoading(true);
        const inventoryCollectionRef = collection(db, 'inventory');
        const unsubscribeInventory = onSnapshot(inventoryCollectionRef, (snapshot) => {
            const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setInventory(inventoryData);
        }, (error) => {
            logError('Inventory-Fetch', error);
            showNotification('Failed to load inventory data.', 'error');
        });

        const configRef = doc(db, 'settings', 'deviceConfiguration');
        const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                setDeviceConfig(docSnap.data().brands || {});
            }
            setIsLoading(false);
        }, (error) => {
            logError('Inventory-SettingsFetch', error);
            showNotification('Failed to load app settings.', 'error');
            setIsLoading(false);
        });

        return () => {
            unsubscribeInventory();
            unsubscribeConfig();
        };
    }, [showNotification]);

    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = inventory.filter(item => {
            const searchString = `${item.brand} ${item.device} ${item.color} ${item.serialNumber}`.toLowerCase();
            return searchString.includes(lowerCaseQuery);
        });
        setFilteredInventory(filtered);
    }, [searchQuery, inventory]);

    const handleAddNew = () => {
        setCurrentItem(null);
        setShowFormModal(true);
    };

    const handleEdit = (item) => {
        setCurrentItem(item);
        setShowFormModal(true);
    };

    const handleDeleteClick = (item) => {
        setCurrentItem(item);
        if (item.condition === 'For Parts') {
            setShowPartsSurvey(true);
        } else {
            setShowDeleteConfirm(true); 
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (!currentItem) return;
        try {
            await deleteDoc(doc(db, 'inventory', currentItem.id));
            showNotification('Item permanently deleted.', 'success');
        } catch (error) {
            logError('Inventory-DeleteConfirm', error);
            showNotification('Error deleting item.', 'error');
        } finally {
            setShowDeleteConfirm(false);
            setCurrentItem(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center">
                         <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                            &larr; Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Inventory Management</h1>
                    </div>
                    <button onClick={handleAddNew} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-indigo-400" disabled={isLoading || Object.keys(deviceConfig).length === 0}>
                        Add New Item
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="mb-4">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by brand, device, color, or serial #"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Brand', 'Device', 'Color', 'Serial #', 'Condition', 'Break-even Cost', 'Actions'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading inventory...</td></tr>
                            ) : filteredInventory.length > 0 ? filteredInventory.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.brand}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.device}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.color}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.serialNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.condition}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${(item.totalCost || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => handleEdit(item)}><EditIcon /></button>
                                            <button onClick={() => handleDeleteClick(item)} title="Archive or Delete"><ArchiveBoxIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No inventory items found. Add one to get started!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {showFormModal && <InventoryForm item={currentItem} deviceConfig={deviceConfig} showNotification={showNotification} onClose={() => setShowFormModal(false)} />}
            
            {showPartsSurvey && <PartsSurveyModal item={currentItem} deviceConfig={deviceConfig} showNotification={showNotification} onClose={() => setShowPartsSurvey(false)} />}

            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} widthClass="max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Deletion</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Are you sure you want to permanently delete this item? This action cannot be undone.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end space-x-4 rounded-b-lg">
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                    <button onClick={handleDeleteConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
                </div>
            </Modal>
        </div>
    );
};

export default DevicesPage;