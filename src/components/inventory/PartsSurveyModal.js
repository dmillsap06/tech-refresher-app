import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import logError from '../../utils/logError';
import Modal from '../common/Modal';

// Add userProfile to props
const PartsSurveyModal = ({ item, deviceConfig, showNotification, onClose, userProfile }) => {
    const [goodParts, setGoodParts] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    const possibleParts = deviceConfig[item.brand]?.devices[item.device]?.parts || [];

    // Helper to check if all are selected
    const allSelected = possibleParts.length > 0 && possibleParts.every(part => goodParts[part.name]);
    const someSelected = possibleParts.some(part => goodParts[part.name]);

    // Handler for "Select All"
    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        const updated = {};
        if (checked) {
            possibleParts.forEach(part => { updated[part.name] = true; });
        }
        setGoodParts(updated);
    };

    const handleTogglePart = (part) => {
        setGoodParts(prev => ({ ...prev, [part.name]: !prev[part.name] }));
    };

    const handleArchive = async () => {
        setIsSaving(true);
        const partsToAdd = possibleParts.filter(part => goodParts[part.name]);

        if (partsToAdd.length === 0) {
            showNotification("Please select at least one good part to harvest.", "error");
            setIsSaving(false);
            return;
        }

        const costPerHarvestedPart = (item.totalCost || 0) / partsToAdd.length;

        try {
            await runTransaction(db, async (transaction) => {
                // 1. Gather all refs and read all docs first
                const partRefs = {};
                const partDocs = {};
                const partIds = partsToAdd.map(part => {
                    const colorIdentifier = part.hasColor ? item.color : 'N/A';
                    const deviceSlug = `${item.brand}-${item.device}`.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '');
                    const partNameSlug = part.name.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '');
                    const colorSlug = colorIdentifier.toLowerCase().replace(/\s+/g, '-').replace(/\//g,'');
                    const partId = `${deviceSlug}-${partNameSlug}-${colorSlug}`;
                    const partRef = doc(db, "parts", partId);
                    partRefs[partId] = partRef;
                    return { part, partId, partRef, colorIdentifier };
                });

                // Perform all reads first
                for (const { partId, partRef } of partIds) {
                    partDocs[partId] = await transaction.get(partRef);
                }

                // Now do all writes
                for (const { part, partId, partRef, colorIdentifier } of partIds) {
                    const partDoc = partDocs[partId];
                    if (partDoc.exists()) {
                        const existingData = partDoc.data();
                        const newQuantity = (existingData.quantity || 0) + 1;
                        const newTotalValue = (existingData.totalValue || 0) + costPerHarvestedPart;
                        transaction.update(partRef, { 
                            quantity: newQuantity,
                            totalValue: newTotalValue,
                            groupId: userProfile?.groupId || null // reinforce groupId on update
                        });
                    } else {
                        transaction.set(partRef, {
                            brand: item.brand,
                            device: item.device,
                            partName: part.name,
                            color: colorIdentifier,
                            quantity: 1,
                            totalValue: costPerHarvestedPart,
                            createdAt: serverTimestamp(),
                            groupId: userProfile?.groupId || null // set groupId on creation
                        });
                    }
                }
                // Archive the item and delete from inventory
                const inventoryItemRef = doc(db, "inventory", item.id);
                const archivedItemRef = doc(db, "archivedInventory", item.id);
                transaction.set(archivedItemRef, { ...item, status: 'Archived (Harvested)', archivedAt: serverTimestamp(), groupId: userProfile?.groupId || null });
                transaction.delete(inventoryItemRef);
            });
            showNotification('Item archived and parts harvested!', 'success');
            onClose();
        } catch (error) {
            logError('PartsSurvey-Archive', error);
            showNotification('Error archiving item.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} widthClass="max-w-lg">
            <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Archive Item & Harvest Parts</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Select usable parts from <span className="font-semibold">{item.brand} {item.device} ({item.color})</span>.
                </p>
            </div>
            <div className="p-6 border-t border-b border-gray-200 dark:border-gray-700 overflow-y-auto">
                <div className="space-y-4">
                    {possibleParts.length > 0 ? (
                        <>
                            {/* Select All checkbox */}
                            <div className="flex items-center mb-2">
                                <input
                                    id="select-all-parts"
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => {
                                        if (el) el.indeterminate = !allSelected && someSelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="select-all-parts" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Select All
                                </label>
                            </div>
                            {possibleParts.map(part => (
                                <div key={part.name} className="flex items-center">
                                    <input
                                        id={`part-${part.name}`}
                                        type="checkbox"
                                        checked={!!goodParts[part.name]}
                                        onChange={() => handleTogglePart(part)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`part-${part.name}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {part.name}
                                    </label>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className="text-center text-gray-500">No parts configured for this device in Settings.</p>
                    )}
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end space-x-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300" disabled={isSaving}>
                    Cancel
                </button>
                <button onClick={handleArchive} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700" disabled={isSaving || possibleParts.length === 0}>
                    {isSaving ? 'Archiving...' : 'Confirm & Archive'}
                </button>
            </div>
        </Modal>
    );
};

export default PartsSurveyModal;