import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, runTransaction, query, where } from 'firebase/firestore';
import logError from '../../utils/logError';
import AddPartForm from './AddPartForm';

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

const MinusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

// Now expects userProfile as a prop!
const PartsPage = ({ onBack, showNotification, userProfile }) => {
    const [parts, setParts] = useState([]);
    const [filteredParts, setFilteredParts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [deviceConfig, setDeviceConfig] = useState({});

    useEffect(() => {
        if (!userProfile?.groupId) return;
        setIsLoading(true);

        // Only fetch parts for the user's group
        const partsCollectionRef = query(
            collection(db, 'parts'),
            where('groupId', '==', userProfile.groupId)
        );
        const unsubscribeParts = onSnapshot(partsCollectionRef, (snapshot) => {
            const partsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setParts(partsData);
        }, (error) => {
            logError('Parts-Fetch', error);
            showNotification("Failed to load parts inventory.", "error");
        });

        const configRef = doc(db, 'settings', 'deviceConfiguration');
        const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                setDeviceConfig(docSnap.data().brands || {});
            }
            setIsLoading(false);
        }, (error) => {
            logError('Parts-SettingsFetch', error);
            showNotification('Failed to load app settings.', 'error');
            setIsLoading(false);
        });

        return () => {
            unsubscribeParts();
            unsubscribeConfig();
        };
    }, [showNotification, userProfile?.groupId]);

    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = parts.filter(part => {
            const searchString = `${part.brand} ${part.device} ${part.partName} ${part.color}`.toLowerCase();
            return searchString.includes(lowerCaseQuery);
        });
        setFilteredParts(filtered);
    }, [searchQuery, parts]);

    const handleQuantityChange = async (part, change) => {
        const newQuantity = part.quantity + change;
        if (newQuantity < 0) return;

        const partRef = doc(db, 'parts', part.id);
        const averageCost = (part.totalValue || 0) / part.quantity || 0;
        const newTotalValue = newQuantity * averageCost;

        try {
            await runTransaction(db, async (transaction) => {
                transaction.update(partRef, { 
                    quantity: newQuantity,
                    totalValue: newTotalValue
                });
            });
        } catch (error) {
            logError('Parts-UpdateQuantity', error);
            showNotification("Failed to update part quantity.", "error");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                    <div className="flex items-center">
                        <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                            &larr; Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Parts Inventory</h1>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200">
                        Add Part/Accessory
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="mb-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by brand, device, part, or color"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Brand', 'Device', 'Part Name', 'Color', 'Avg. Cost', 'Quantity'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading parts...</td></tr>
                            ) : filteredParts.length > 0 ? filteredParts.map((part) => (
                                <tr key={part.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{part.brand}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{part.device}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{part.partName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{part.color}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${((part.totalValue || 0) / part.quantity || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleQuantityChange(part, -1)} className="p-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200">
                                                <MinusIcon />
                                            </button>
                                            <span className="font-semibold text-lg">{part.quantity}</span>
                                            <button onClick={() => handleQuantityChange(part, 1)} className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200">
                                                <PlusIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No parts found in inventory.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
            {showAddModal && <AddPartForm deviceConfig={deviceConfig} showNotification={showNotification} onClose={() => setShowAddModal(false)} userProfile={userProfile} />}
        </div>
    );
};

export default PartsPage;