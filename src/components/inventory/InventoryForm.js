import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { addDoc, updateDoc, doc, serverTimestamp, collection } from 'firebase/firestore';
import logError from '../../utils/logError';
import Modal from '../common/Modal'; // Import the new reusable Modal

// --- Static list for conditions ---
const conditions = ["New", "Used", "Refurbished", "For Parts"];

const InventoryForm = ({ item, deviceConfig, showNotification, onClose }) => {
    const [formData, setFormData] = useState({
        brand: item?.brand || Object.keys(deviceConfig)[0] || '',
        device: item?.device || '',
        type: item?.type || '',
        color: item?.color || '', 
        serialNumber: item?.serialNumber || '', 
        condition: item?.condition || conditions[0],
        acqCost: item?.acqCost || 0, 
        partCost: item?.partCost || 0, 
        dateAcquired: item?.dateAcquired || '', 
        notes: item?.notes || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- Dependent Dropdown Logic ---
    const brands = useMemo(() => Object.keys(deviceConfig).sort(), [deviceConfig]);
    
    const devicesForBrand = useMemo(() => 
        formData.brand && deviceConfig[formData.brand] ? Object.keys(deviceConfig[formData.brand].devices).sort() : [],
        [deviceConfig, formData.brand]
    );

    const propertiesForDevice = useMemo(() =>
        formData.brand && formData.device ? deviceConfig[formData.brand]?.devices[formData.device] : null,
        [deviceConfig, formData.brand, formData.device]
    );

    const colorsForDevice = useMemo(() =>
        propertiesForDevice?.colors || [],
        [propertiesForDevice]
    );

    useEffect(() => {
        if (item) return; 
        const newDevice = devicesForBrand[0] || '';
        setFormData(prev => ({ ...prev, device: newDevice }));
    }, [formData.brand, item, devicesForBrand]);

    useEffect(() => {
        if (item) return;
        const newProperties = propertiesForDevice;
        const newColor = newProperties?.colors?.[0] || '';
        const newType = newProperties?.type || '';
        setFormData(prev => ({ ...prev, color: newColor, type: newType }));
    }, [formData.device, item, propertiesForDevice]);


    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        const acqCost = parseFloat(formData.acqCost) || 0;
        const partCost = parseFloat(formData.partCost) || 0;
        const totalCost = acqCost + partCost;

        const dataToSave = {
            brand: formData.brand,
            device: formData.device,
            type: propertiesForDevice?.type || 'Unknown',
            color: formData.color,
            serialNumber: formData.serialNumber,
            condition: formData.condition,
            dateAcquired: formData.dateAcquired,
            notes: formData.notes,
            acqCost,
            partCost,
            totalCost,
            status: formData.condition === 'For Parts' ? 'For Parts' : 'In Stock'
        };
        
        try {
            if (item) {
                await updateDoc(doc(db, 'inventory', item.id), { ...dataToSave, updatedAt: serverTimestamp() });
                showNotification('Item updated successfully!', 'success');
            } else {
                await addDoc(collection(db, 'inventory'), { ...dataToSave, createdAt: serverTimestamp() });
                showNotification('New item added to inventory!', 'success');
            }
            onClose();
        } catch (error) {
            logError('InventoryForm-Save', error);
            showNotification('Error saving item. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderSelectField = (label, id, value, options, onChange, disabled = false) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <select id={id} value={value} onChange={onChange} disabled={disabled} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200 dark:disabled:bg-gray-600">
                <option value="">Select...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );

    const renderInputField = (label, id, type = 'text', value, disabled = false) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <input type={type} id={id} value={value} onChange={(e) => setFormData({...formData, [id]: e.target.value})} {...(type === 'number' && { step: '0.01' })} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-200 dark:disabled:bg-gray-600" />
        </div>
    );
    
    return (
        <Modal isOpen={true} onClose={onClose} widthClass="max-w-3xl">
            <form onSubmit={handleSave}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{item ? 'Edit Item' : 'Add New Item'}</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {renderSelectField('Brand', 'brand', formData.brand, brands, (e) => setFormData({...formData, brand: e.target.value}))}
                        {renderSelectField('Device', 'device', formData.device, devicesForBrand, (e) => setFormData({...formData, device: e.target.value}), !formData.brand)}
                        {renderSelectField('Color', 'color', formData.color, colorsForDevice, (e) => setFormData({...formData, color: e.target.value}), !formData.device)}
                        {renderSelectField('Condition', 'condition', formData.condition, conditions, (e) => setFormData({...formData, condition: e.target.value}))}
                        {renderInputField('Serial Number', 'serialNumber', 'text', formData.serialNumber)}
                        {renderInputField('Date Acquired', 'dateAcquired', 'date', formData.dateAcquired)}
                    </div>
                    <hr className="my-6 border-gray-200 dark:border-gray-700"/>
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Financial Info</h4>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInputField('Acquisition Cost', 'acqCost', 'number', formData.acqCost)}
                        {renderInputField('Part Cost', 'partCost', 'number', formData.partCost)}
                    </div>
                    <div className="mt-4">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                        <textarea id="notes" rows="3" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300" disabled={isSaving}>Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default InventoryForm;