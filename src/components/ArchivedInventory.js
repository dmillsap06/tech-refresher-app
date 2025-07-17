import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import logError from '../utils/logError';

const ViewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 hover:text-blue-700" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);

const ArchivedInventory = ({ onBack, showNotification, userProfile }) => {
    const [archivedItems, setArchivedItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        if (!userProfile?.groupId) return;
        const archivedCollectionRef = collection(db, 'archivedInventory');
        const q = query(
            archivedCollectionRef,
            where('groupId', '==', userProfile.groupId),
            orderBy('archivedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setArchivedItems(items);
            setIsLoading(false);
        }, (error) => {
            logError('ArchivedInventory-Fetch', error);
            showNotification("Failed to load archived inventory.", "error");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [showNotification, userProfile?.groupId]);

    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = archivedItems.filter(item => {
            const searchString = `${item.brand} ${item.device} ${item.color} ${item.serialNumber}`.toLowerCase();
            return searchString.includes(lowerCaseQuery);
        });
        setFilteredItems(filtered);
    }, [searchQuery, archivedItems]);

    const handleViewDetails = (item) => {
        setSelectedItem(item);
        setShowDetailModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                        &larr; Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Archived Inventory</h1>
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
                                {['Date Archived', 'Brand', 'Device', 'Serial #', 'Final Status', 'Net Profit', 'Actions'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading archived items...</td></tr>
                            ) : filteredItems.length > 0 ? filteredItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.archivedAt ? new Date(item.archivedAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.brand}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.device}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.serialNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.status}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${(item.netProfit || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button onClick={() => handleViewDetails(item)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                            <ViewIcon />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No items have been archived yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
            {showDetailModal && <ArchiveDetailModal item={selectedItem} onClose={() => setShowDetailModal(false)} />}
        </div>
    );
};

const ArchiveDetailModal = ({ item, onClose }) => {
    if (!item) return null;

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl max-h-full flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Archived Item Details</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.brand} {item.device} - {item.color} (SN: {item.serialNumber})</p>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="font-medium text-gray-600 dark:text-gray-400">Date Acquired:</div>
                        <div>{item.dateAcquired || 'N/A'}</div>

                        <div className="font-medium text-gray-600 dark:text-gray-400">Date Archived:</div>
                        <div>{item.archivedAt ? new Date(item.archivedAt.toDate()).toLocaleString() : 'N/A'}</div>
                        
                        <div className="font-medium text-gray-600 dark:text-gray-400">Final Status:</div>
                        <div>{item.status}</div>
                        
                        <div className="font-medium text-gray-600 dark:text-gray-400">Break-even Cost:</div>
                        <div>${(item.totalCost || 0).toFixed(2)}</div>

                        {item.status === 'Sold' && (
                            <>
                                <div className="font-medium text-gray-600 dark:text-gray-400">Order ID:</div>
                                <div>{item.orderId || 'N/A'}</div>
                                <div className="font-medium text-gray-600 dark:text-gray-400">Final Sale Price:</div>
                                <div className="text-green-600 dark:text-green-400 font-semibold">${(item.finalSalePrice || 0).toFixed(2)}</div>
                                <div className="font-medium text-gray-600 dark:text-gray-400">Net Profit:</div>
                                <div className="text-green-600 dark:text-green-400 font-semibold">${(item.netProfit || 0).toFixed(2)}</div>
                            </>
                        )}
                    </div>
                     <div>
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Notes</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">{item.notes || 'No notes provided.'}</p>
                    </div>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300">Close</button>
                </div>
            </div>
        </div>
    );
};

export default ArchivedInventory;