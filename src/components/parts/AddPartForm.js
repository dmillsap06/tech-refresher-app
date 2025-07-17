import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import logError from '../../utils/logError';
import Modal from '../common/Modal'; // Import the reusable Modal

// Add userProfile prop
const AddPartForm = ({ deviceConfig, showNotification, onClose, userProfile }) => {
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
                    // Optionally, you can also re-enforce groupId in update:
                    transaction.update(partRef, {
                        quantity: newQuantity,
                        totalValue: newTotalValue,
                        groupId: userProfile?.groupId || null
                    });
                } else {
                    const totalValue = quantityToAdd * costPerItem;
                    transaction.set(partRef, {
                        brand: formData.brand,
                        device: formData.device,
                        partName: formData.partName,
                        color: finalColor,
                        quantity: quantityToAdd,
                        totalValue: totalValue,
                        createdAt: serverTimestamp(),
                        groupId: userProfile?.groupId || null // always set groupId!
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
         <Modal isOpen={true} onClose={onClose} widthClass="max-w-lg">
            <form onSubmit={handleSave}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Part/Accessory to Inventory</h3>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                            <select id="brand" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none">
                                {brands.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="device" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Works With (Device)</label>
                            <select id="device" value={formData.device} onChange={(e) => setFormData({...formData, device: e.target.value})} disabled={!formData.brand} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none">
                                <option value="">Select a device...</option>
                                {devicesForBrand.map(device => <option key={device} value={device}>{device}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            <select id="category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} disabled={!formData.device} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none">
                                <option>Accessory</option>
                                <option>Game</option>
                            </select>
                        </div>

                        {formData.category === 'Accessory' && (
                            <div>
                                <label htmlFor="partName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Accessory Name</label>
                                <select id="partName" value={formData.partName} onChange={(e) => setFormData({...formData, partName: e.target.value})} disabled={accessoriesForDevice.length === 0} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none">
                                    <option value="">Select an accessory...</option>
                                    {accessoriesForDevice.map(acc => <option key={acc.name} value={acc.name}>{acc.name}</option>)}
                                </select>
                            </div>
                        )}
                        {formData.category === 'Game' && (
                            <div>
                                <label htmlFor="partName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Game Title</label>
                                <input type="text" id="partName" value={formData.partName} onChange={(e) => setFormData({...formData, partName: e.target.value})} placeholder="Enter game title" className="mt-1 block w-full px-3 py-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none" />
                            </div>
                        )}

                        <div className="flex items-center">
                            <input id="hasColor" type="checkbox" checked={formData.hasColor} onChange={(e) => setFormData(p => ({...p, hasColor: e.target.checked, color: ''}))} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                            <label htmlFor="hasColor" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">This part has a color</label>
                        </div>
                        {formData.hasColor && (
                            <div>
                                <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                                <select id="color" value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none">
                                    <option value="">Select a color...</option>
                                    {colorsForDevice.map(color => <option key={color} value={color}>{color}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                                <input type="number" id="quantity" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} min="1" className="mt-1 block w-full px-3 py-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none" />
                            </div>
                            <div>
                                <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost (per item)</label>
                                <input type="number" id="cost" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300" disabled={isSaving}>
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Add to Inventory'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddPartForm;