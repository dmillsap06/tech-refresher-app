import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import logError from '../utils/logError';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

const Settings = ({ onBack, showNotification }) => {
    const [brands, setBrands] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const [newBrand, setNewBrand] = useState('');
    const [newDevice, setNewDevice] = useState({ name: '', type: 'Console' });
    const [newColor, setNewColor] = useState('');
    const [newPart, setNewPart] = useState({ name: '', hasColor: false }); // Removed cost from here
    const [newAccessory, setNewAccessory] = useState({ name: '', cost: 0 });

    useEffect(() => {
        const configRef = doc(db, 'settings', 'deviceConfiguration');
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.types && !data.brands) {
                    const newBrandsStructure = {};
                    for (const deviceType in data.types) {
                        const brand = deviceType.split(' ')[0] || 'Unknown';
                        if (!newBrandsStructure[brand]) {
                            newBrandsStructure[brand] = { devices: {} };
                        }
                        newBrandsStructure[brand].devices[deviceType] = {
                            type: 'Console',
                            ...data.types[deviceType]
                        };
                    }
                    setBrands(newBrandsStructure);
                    setDoc(configRef, { brands: newBrandsStructure });
                } else {
                    setBrands(data.brands || {});
                }
            }
            setIsLoading(false);
        }, (error) => {
            logError('Settings-Fetch', error);
            showNotification('Failed to load settings.', 'error');
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [showNotification]);

    const handleAddBrand = async (e) => {
        e.preventDefault();
        if (!newBrand.trim() || brands[newBrand.trim()]) return;
        const updatedBrands = { ...brands, [newBrand.trim()]: { devices: {} } };
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands }, { merge: true });
            showNotification(`Brand "${newBrand.trim()}" added.`, 'success');
            setNewBrand('');
        } catch (error) {
            logError('Settings-AddBrand', error);
            showNotification('Failed to add brand.', 'error');
        }
    };

    const handleDeleteBrand = async (brandName) => {
        const { [brandName]: _, ...remainingBrands } = brands;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: remainingBrands });
            showNotification(`Brand "${brandName}" deleted.`, 'success');
            if(selectedBrand === brandName) {
                setSelectedBrand(null);
                setSelectedDevice(null);
            }
        } catch (error) {
            logError('Settings-DeleteBrand', error);
            showNotification('Failed to delete brand.', 'error');
        }
    };

    const handleAddDevice = async (e) => {
        e.preventDefault();
        if (!newDevice.name.trim() || !selectedBrand || brands[selectedBrand].devices[newDevice.name.trim()]) return;
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[newDevice.name.trim()] = {
            type: newDevice.type,
            colors: [],
            parts: [],
            accessories: []
        };
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Device "${newDevice.name.trim()}" added.`, 'success');
            setNewDevice({ name: '', type: 'Console' });
        } catch(error) {
            logError('Settings-AddDevice', error);
            showNotification('Failed to add device.', 'error');
        }
    };

    const handleDeleteDevice = async (deviceName) => {
        const { [deviceName]: _, ...remainingDevices } = brands[selectedBrand].devices;
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices = remainingDevices;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Device "${deviceName}" deleted.`, 'success');
            if(selectedDevice === deviceName) setSelectedDevice(null);
        } catch(error) {
            logError('Settings-DeleteDevice', error);
            showNotification('Failed to delete device.', 'error');
        }
    };

    const handleAddColor = async (e) => {
        e.preventDefault();
        if (!newColor.trim() || !selectedDevice) return;
        const currentColors = brands[selectedBrand].devices[selectedDevice].colors || [];
        const updatedColors = [...currentColors, newColor.trim()].sort();
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[selectedDevice].colors = updatedColors;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Color "${newColor.trim()}" added.`, 'success');
            setNewColor('');
        } catch(error) {
            logError('Settings-AddColor', error);
            showNotification('Failed to add color.', 'error');
        }
    };

    const handleDeleteColor = async (colorToDelete) => {
        if (!selectedDevice) return;
        const updatedColors = (brands[selectedBrand].devices[selectedDevice].colors || []).filter(c => c !== colorToDelete);
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[selectedDevice].colors = updatedColors;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Color "${colorToDelete}" deleted.`, 'success');
        } catch (error) {
            logError('Settings-DeleteColor', error);
            showNotification('Failed to delete color.', 'error');
        }
    };
    
     const handleAddPart = async (e) => {
        e.preventDefault();
        if (!newPart.name.trim() || !selectedDevice) return;
        const currentParts = brands[selectedBrand].devices[selectedDevice].parts || [];
        const updatedParts = [...currentParts, { name: newPart.name, hasColor: newPart.hasColor }].sort((a, b) => a.name.localeCompare(b.name));
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[selectedDevice].parts = updatedParts;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Internal Part "${newPart.name.trim()}" added.`, 'success');
            setNewPart({ name: '', hasColor: false });
        } catch(error) {
            logError('Settings-AddPart', error);
            showNotification('Failed to add part.', 'error');
        }
    };

    const handleDeletePart = async (partToDelete) => {
        if (!selectedDevice) return;
        const updatedParts = (brands[selectedBrand].devices[selectedDevice].parts || []).filter(p => p.name !== partToDelete.name);
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[selectedDevice].parts = updatedParts;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Part "${partToDelete.name}" deleted.`, 'success');
        } catch (error) {
            logError('Settings-DeletePart', error);
            showNotification('Failed to delete part.', 'error');
        }
    };

    const handleAddAccessory = async (e) => {
        e.preventDefault();
        if (!newAccessory.name.trim() || !selectedDevice) return;
        const currentAccessories = brands[selectedBrand].devices[selectedDevice].accessories || [];
        const updatedAccessories = [...currentAccessories, { ...newAccessory, cost: parseFloat(newAccessory.cost) || 0 }].sort((a, b) => a.name.localeCompare(b.name));
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[selectedDevice].accessories = updatedAccessories;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Accessory "${newAccessory.name.trim()}" added.`, 'success');
            setNewAccessory({ name: '', cost: 0 });
        } catch(error) {
            logError('Settings-AddAccessory', error);
            showNotification('Failed to add accessory.', 'error');
        }
    };

     const handleDeleteAccessory = async (accessoryToDelete) => {
        if (!selectedDevice) return;
        const updatedAccessories = (brands[selectedBrand].devices[selectedDevice].accessories || []).filter(p => p.name !== accessoryToDelete.name);
        const updatedBrands = { ...brands };
        updatedBrands[selectedBrand].devices[selectedDevice].accessories = updatedAccessories;
        try {
            await setDoc(doc(db, 'settings', 'deviceConfiguration'), { brands: updatedBrands });
            showNotification(`Accessory "${accessoryToDelete.name}" deleted.`, 'success');
        } catch (error) {
            logError('Settings-DeleteAccessory', error);
            showNotification('Failed to delete accessory.', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
                    <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        &larr; Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">App Settings</h1>
                </div>
            </header>
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">How to Use This Page</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Follow the steps from left to right to build your product catalog. First, add a brand. Then, select that brand to add its devices. Finally, select a device to add its specific properties like colors and parts.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* --- Brands Column --- */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Step 1: Brands</h3>
                        <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
                            <input type="text" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Add new brand" className="flex-grow input"/>
                            <button type="submit" className="btn-primary">Add</button>
                        </form>
                        <ul className="space-y-2">
                            {isLoading ? <p>Loading...</p> : Object.keys(brands).sort().map(brand => (
                                <li key={brand} onClick={() => { setSelectedBrand(brand); setSelectedDevice(null); }} className={`list-item ${selectedBrand === brand ? 'active' : ''}`}>
                                    <span>{brand}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }}><TrashIcon /></button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* --- Devices Column --- */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Step 2: Devices</h3>
                        {selectedBrand ? (
                            <div>
                                <form onSubmit={handleAddDevice} className="space-y-2 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <input type="text" value={newDevice.name} onChange={(e) => setNewDevice({...newDevice, name: e.target.value})} placeholder={`Add new ${selectedBrand} device`} className="w-full input"/>
                                    <select value={newDevice.type} onChange={(e) => setNewDevice({...newDevice, type: e.target.value})} className="w-full input">
                                        <option>Console</option>
                                        <option>Game</option>
                                        <option>Accessory</option>
                                        <option>Other</option>
                                    </select>
                                    <button type="submit" className="btn-primary w-full">Add Device</button>
                                </form>
                                <ul className="space-y-2">
                                    {Object.keys(brands[selectedBrand].devices).sort().map(device => (
                                        <li key={device} onClick={() => setSelectedDevice(device)} className={`list-item ${selectedDevice === device ? 'active' : ''}`}>
                                            <span>{device} <span className="text-xs text-gray-500">({brands[selectedBrand].devices[device].type})</span></span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDevice(device); }}><TrashIcon /></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : <div className="text-center text-gray-500 pt-16"><p>Select a brand to see its devices.</p></div>}
                    </div>

                    {/* --- Properties Column --- */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Step 3: Properties</h3>
                        {selectedDevice ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Colors</h4>
                                     <form onSubmit={handleAddColor} className="flex gap-2 my-2">
                                        <input type="text" value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Add new color" className="flex-grow input"/>
                                        <button type="submit" className="btn-secondary">Add</button>
                                    </form>
                                     <ul className="space-y-1 max-h-24 overflow-y-auto">{(brands[selectedBrand].devices[selectedDevice].colors || []).map(c => <li key={c} className="sub-list-item"><span>{c}</span><button onClick={() => handleDeleteColor(c)}><TrashIcon/></button></li>)}</ul>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Internal Parts</h4>
                                    <form onSubmit={handleAddPart} className="space-y-2 my-2">
                                        <input type="text" value={newPart.name} onChange={(e) => setNewPart(p => ({...p, name: e.target.value}))} placeholder="Add new internal part" className="w-full input" />
                                        <div className="flex items-center justify-center">
                                            <input id="hasColor" type="checkbox" checked={newPart.hasColor} onChange={(e) => setNewPart(p => ({...p, hasColor: e.target.checked}))} className="h-4 w-4 checkbox" /><label htmlFor="hasColor" className="ml-2 text-sm">Has Color</label>
                                        </div>
                                        <button type="submit" className="btn-secondary w-full">Add Part</button>
                                    </form>
                                    <ul className="space-y-1 max-h-24 overflow-y-auto">{(brands[selectedBrand].devices[selectedDevice].parts || []).map(p => <li key={p.name} className="sub-list-item"><span>{p.name} {p.hasColor && <span className="text-xs text-indigo-500">(Has Color)</span>}</span><button onClick={() => handleDeletePart(p)}><TrashIcon /></button></li>)}</ul>
                                </div>
                                 <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Related Accessories</h4>
                                    <form onSubmit={handleAddAccessory} className="space-y-2 my-2">
                                        <input type="text" value={newAccessory.name} onChange={(e) => setNewAccessory(p => ({...p, name: e.target.value}))} placeholder="Add new accessory" className="w-full input" />
                                        <div>
                                            <label htmlFor="accessoryCost" className="text-xs text-gray-500">Cost</label>
                                            <input id="accessoryCost" type="number" value={newAccessory.cost} onChange={(e) => setNewAccessory(p => ({...p, cost: e.target.value}))} placeholder="Cost" step="0.01" className="w-full input" />
                                        </div>
                                        <button type="submit" className="btn-secondary w-full">Add Accessory</button>
                                    </form>
                                    <ul className="space-y-1 max-h-24 overflow-y-auto">{(brands[selectedBrand].devices[selectedDevice].accessories || []).map(p => <li key={p.name} className="sub-list-item"><span>{p.name} (${(p.cost || 0).toFixed(2)})</span><button onClick={() => handleDeleteAccessory(p)}><TrashIcon /></button></li>)}</ul>
                                </div>
                            </div>
                        ) : <div className="text-center text-gray-500 pt-16"><p>Select a device to see its properties.</p></div>}
                    </div>
                </div>
            </main>
            <style>{`
                .input { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #D1D5DB; background-color: #FFF; }
                .dark .input { background-color: #374151; border-color: #4B5563; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #4F46E5; color: white; font-weight: 600; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #10B981; color: white; font-weight: 600; }
                .list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s; }
                .list-item:hover { background-color: #F3F4F6; }
                .dark .list-item:hover { background-color: #374151; }
                .list-item.active { background-color: #E0E7FF; color: #312E81; font-weight: 600; }
                .dark .list-item.active { background-color: #3730A3; color: #EEF2FF; }
                .sub-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-radius: 0.375rem; background-color: #F9FAFB; }
                .dark .sub-list-item { background-color: #374151; }
                .checkbox { height: 1rem; width: 1rem; border-radius: 0.25rem; border-color: #9CA3AF; color: #4F46E5; }
            `}</style>
        </div>
    );
};

export default Settings;