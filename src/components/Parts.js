import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import logError from '../utils/logError';

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

const Parts = ({ onBack, showNotification }) => {
    const [parts, setParts] = useState([]);
    const [filteredParts, setFilteredParts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [deviceConfig, setDeviceConfig] = useState({});

    useEffect(() => {
        setIsLoading(true);
        const partsCollectionRef = collection(db, 'parts');
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
    }, [showNotification]);

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
                        <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                            &larr; Dashboard
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Parts Inventory</h1>
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-indigo-400" disabled={isLoading || Object.keys(deviceConfig).length === 0}>
                        Add New Part
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
            {showAddModal && <AddPartForm deviceConfig={deviceConfig} showNotification={showNotification} onClose={() => setShowAddModal(false)} />}
        </div>
    );
};

const AddPartForm = ({ deviceConfig, showNotification, onClose }) => {
    const [formData, setFormData] = useState({
        brand: Object.keys(deviceConfig)[0] || '',
        device: '',
        category: 'Accessory', // Accessory, Game
        partName: '',
        color: '',
        quantity: 1,
        cost: 0,
        hasColor: false
    });
    const [isSaving, setIsSaving] = useState(false);

    const brands = Object.keys(deviceConfig).sort();
    const devicesForBrand = formData.brand ? Object.keys(deviceConfig[formData.brand].devices).sort() : [];
    const accessoriesForDevice = formData.device ? (deviceConfig[formData.brand]?.devices[formData.device]?.accessories || []).sort((a,b) => a.name.localeCompare(b.name)) : [];
    const colorsForDevice = formData.device ? (deviceConfig[formData.brand]?.devices[formData.device]?.colors || []).sort() : [];

    useEffect(() => {
        setFormData(prev => ({ ...prev, device: '', partName: '', color: '', hasColor: false, cost: 0 }));
    }, [formData.brand]);

    useEffect(() => {
        setFormData(prev => ({ ...prev, partName: '', color: '', hasColor: false, cost: 0 }));
    }, [formData.device, formData.category]);

    const handleSave = async (e) => {
        e.preventDefault();
        const finalColor = formData.hasColor ? formData.color : 'N/A';
        const costPerItem = parseFloat(formData.cost) || 0;
        const quantityToAdd = parseInt(formData.quantity, 10);

        if (!formData.brand || !formData.device || !formData.partName || !finalColor || quantityToAdd < 1) {
            showNotification("Please fill out all fields correctly.", "error");
            return;
        }
        setIsSaving(true);

        try {
            await runTransaction(db, async (transaction) => {
                const deviceSlug = `${formData.brand}-${formData.device}`.toLowerCase().replace(/\s+/g, '-');
                const partNameSlug = formData.partName.toLowerCase().replace(/\s+/g, '-');
                const colorSlug = finalColor.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '');
                const partId = `${deviceSlug}-${partNameSlug}-${colorSlug}`;

                const partRef = doc(db, "parts", partId);
                const partDoc = await transaction.get(partRef);

                if (partDoc.exists()) {
                    const existingData = partDoc.data();
                    const newQuantity = (existingData.quantity || 0) + quantityToAdd;
                    const newValueOfAddedItems = quantityToAdd * costPerItem;
                    const newTotalValue = (existingData.totalValue || 0) + newValueOfAddedItems;
                    transaction.update(partRef, { quantity: newQuantity, totalValue: newTotalValue });
                } else {
                    const totalValue = quantityToAdd * costPerItem;
                    transaction.set(partRef, {
                        brand: formData.brand,
                        device: formData.device,
                        partName: formData.partName,
                        color: finalColor,
                        quantity: quantityToAdd,
                        totalValue: totalValue,
                        createdAt: serverTimestamp()
                    });
                }
            });
            showNotification('Part(s) added successfully!', 'success');
            onClose();
        } catch (error) {
            logError('AddPartForm-Save', error);
            showNotification("Failed to add part(s) to inventory.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSave}>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Part/Accessory to Inventory</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                                <select id="brand" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                    {brands.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="device" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Works With (Device)</label>
                                <select id="device" value={formData.device} onChange={(e) => setFormData({...formData, device: e.target.value})} disabled={!formData.brand} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200 dark:disabled:bg-gray-600">
                                    <option value="">Select a device...</option>
                                    {devicesForBrand.map(device => <option key={device} value={device}>{device}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                                <select id="category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} disabled={!formData.device} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200 dark:disabled:bg-gray-600">
                                    <option>Accessory</option>
                                    <option>Game</option>
                                </select>
                            </div>

                            {formData.category === 'Accessory' && (
                                 <div>
                                    <label htmlFor="partName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Accessory Name</label>
                                    <select id="partName" value={formData.partName} onChange={(e) => setFormData({...formData, partName: e.target.value})} disabled={accessoriesForDevice.length === 0} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200 dark:disabled:bg-gray-600">
                                        <option value="">Select an accessory...</option>
                                        {accessoriesForDevice.map(acc => <option key={acc.name} value={acc.name}>{acc.name}</option>)}
                                    </select>
                                </div>
                            )}
                             {formData.category === 'Game' && (
                                <div>
                                    <label htmlFor="partName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Game Title</label>
                                    <input type="text" id="partName" value={formData.partName} onChange={(e) => setFormData({...formData, partName: e.target.value})} placeholder="Enter game title" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            )}

                            <div className="flex items-center">
                                <input id="hasColor" type="checkbox" checked={formData.hasColor} onChange={(e) => setFormData(p => ({...p, hasColor: e.target.checked, color: ''}))} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                                <label htmlFor="hasColor" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">This part has a color</label>
                            </div>
                             {formData.hasColor && (
                                <div>
                                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                                    <select id="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="">Select a color...</option>
                                        {colorsForDevice.map(color => <option key={color} value={color}>{color}</option>)}
                                    </select>
                                </div>
                            )}
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                                    <input type="number" id="quantity" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} min="1" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost (per item)</label>
                                    <input type="number" id="cost" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300" disabled={isSaving}>Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Add to Inventory'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default Parts;