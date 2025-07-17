import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import logError from '../../utils/logError';
import Modal from '../common/Modal'; // Import the reusable Modal

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-red-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1[...]
    </svg>
);

// Add userProfile as a prop
const OrderForm = ({ showNotification, onClose, userProfile }) => {
    const [formData, setFormData] = useState({
        platform: 'eBay', orderNumber: '', totalPaid: 0, platformFee: 0, packingCost: 0, shippingCost: 0,
        inventoryItemId: '', soldParts: []
    });
    const [inventory, setInventory] = useState([]);
    const [parts, setParts] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedPart, setSelectedPart] = useState('');

    useEffect(() => {
        const invRef = collection(db, 'inventory');
        const unsubscribeInv = onSnapshot(invRef, snapshot => {
            const availableItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(item => item.condition !== 'For Parts');
            setInventory(availableItems);
        }, (error) => {
             logError('OrderForm-FetchInventory', error);
             showNotification("Failed to load available inventory.", "error");
        });

        const partsRef = collection(db, 'parts');
        const unsubscribeParts = onSnapshot(partsRef, snapshot => {
            const availableParts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(part => part.quantity > 0);
            setParts(availableParts);
        }, (error) => {
            logError('OrderForm-FetchParts', error);
            showNotification("Failed to load available parts.", "error");
        });

        return () => {
            unsubscribeInv();
            unsubscribeParts();
        };
    }, [showNotification]);

    const handleAddPart = () => {
        if (!selectedPart) return;
        const partToAdd = parts.find(p => p.id === selectedPart);
        if (partToAdd && !formData.soldParts.some(p => p.id === partToAdd.id)) {
            setFormData(prev => ({ ...prev, soldParts: [...prev.soldParts, partToAdd] }));
        }
        setSelectedPart('');
    };

    const handleRemovePart = (partId) => {
        setFormData(prev => ({...prev, soldParts: prev.soldParts.filter(p => p.id !== partId)}));
    };
    
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const selectedItem = inventory.find(i => i.id === formData.inventoryItemId);
        if (!selectedItem) {
            showNotification("Please select a valid inventory item.", "error");
            setIsSaving(false);
            return;
        }

        const totalPaid = parseFloat(formData.totalPaid) || 0;
        const platformFee = parseFloat(formData.platformFee) || 0;
        const packingCost = parseFloat(formData.packingCost) || 0;
        const shippingCost = parseFloat(formData.shippingCost) || 0;
        
        const totalSaleCost = platformFee + packingCost + shippingCost;
        const itemBreakEvenCost = selectedItem.totalCost || 0;
        const extraPartsCost = formData.soldParts.reduce((sum, part) => {
            const partAvgCost = (part.totalValue || 0) / (part.quantity || 1);
            return sum + partAvgCost;
        }, 0);
        
        const netProfit = totalPaid - totalSaleCost - itemBreakEvenCost - extraPartsCost;

        const orderData = {
            ...formData,
            soldParts: formData.soldParts.map(p => ({...p})),
            totalPaid, platformFee, packingCost, shippingCost,
            extraPartsCost,
            netProfit,
            createdAt: serverTimestamp(),
            soldItemDetails: { ...selectedItem },
            groupId: userProfile?.groupId || null // <--- set groupId on order!
        };

        try {
            await runTransaction(db, async (transaction) => {
                const newOrderRef = doc(collection(db, 'orders'));
                transaction.set(newOrderRef, orderData);

                const inventoryItemRef = doc(db, "inventory", selectedItem.id);
                const archivedItemRef = doc(db, "archivedInventory", selectedItem.id);
                transaction.set(archivedItemRef, { ...selectedItem, status: 'Sold', archivedAt: serverTimestamp(), orderId: newOrderRef.id, groupId: userProfile?.groupId || null });
                transaction.delete(inventoryItemRef);
                for (const part of formData.soldParts) {
                    const partRef = doc(db, "parts", part.id);
                    const partDoc = await transaction.get(partRef);
                    if (partDoc.exists()) {
                        const newQuantity = (partDoc.data().quantity || 0) - 1;
                        const avgCost = (partDoc.data().totalValue || 0) / (partDoc.data().quantity || 1);
                        const newTotalValue = (partDoc.data().totalValue || 0) - avgCost;
                        transaction.update(partRef, { quantity: newQuantity, totalValue: newTotalValue, groupId: userProfile?.groupId || null }); // reinforce groupId
                    }
                }
            });
            showNotification("Order created successfully!", "success");
            onClose();
        } catch (error) {
            logError('OrderForm-Save', error);
            showNotification("Failed to create order. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const renderInputField = (label, id, type = 'text', value) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <input type={type} id={id} value={value} onChange={(e) => setFormData({...formData, [id]: e.target.value})} {...(type === 'number' && { step: '0.01' })} className="mt-1 block w-full px-3 p[...]
        </div>
    );
    
    return (
        <Modal isOpen={true} onClose={onClose} widthClass="max-w-2xl">
            <form onSubmit={handleSave}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Order</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Platform</label>
                            <select id="platform" value={formData.platform} onChange={(e) => setFormData({...formData, platform: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-bas[...]
                                <option>eBay</option>
                                <option>Facebook Marketplace</option>
                                <option>Local Sale</option>
                                <option>Other</option>
                            </select>
                        </div>
                        {renderInputField('Order Number', 'orderNumber', 'text', formData.orderNumber)}
                    </div>
                    <hr className="my-6 border-gray-200 dark:border-gray-700"/>
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Sale Details</h4>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {renderInputField('Total Amount Paid', 'totalPaid', 'number', formData.totalPaid)}
                        {renderInputField('Platform Fee', 'platformFee', 'number', formData.platformFee)}
                        {renderInputField('Packing Cost', 'packingCost', 'number', formData.packingCost)}
                        {renderInputField('Shipping Cost', 'shippingCost', 'number', formData.shippingCost)}
                    </div>
                    <hr className="my-6 border-gray-200 dark:border-gray-700"/>
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">Items Sold</h4>
                    <div className="mt-4">
                        <label htmlFor="inventoryItemId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Main Inventory Item</label>
                        <select id="inventoryItemId" value={formData.inventoryItemId} onChange={(e) => setFormData({...formData, inventoryItemId: e.target.value})} className="mt-1 block w-full pl-3 pr[...]
                            <option value="">Select an item...</option>
                            {inventory.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.brand} {item.device} - {item.color} (SN: {item.serialNumber})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">(Optional) Add Additional Parts</label>
                        <div className="mt-1 flex gap-2">
                            <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)} className="flex-grow pl-3 pr-10 py-2 text-base border-gray-300 dark:bg-gray-700 dark:border-g[...]
                                <option value="">Select a part to add...</option>
                                {parts.map(part => (
                                    <option key={part.id} value={part.id}>
                                        {part.brand} {part.device} - {part.partName} ({part.color})
                                    </option>
                                ))}
                            </select>
                            <button type="button" onClick={handleAddPart} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700">Add</button>
                        </div>
                    </div>
                    {formData.soldParts.length > 0 && (
                        <ul className="mt-4 space-y-2">
                            {formData.soldParts.map(part => (
                                <li key={part.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-300">{part.brand} {part.device} - {part.partName} ({part.color})</span>
                                    <button type="button" onClick={() => handleRemovePart(part.id)}><TrashIcon /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end space-x-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300" disable[...]
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700" disabled={isSaving || !formData.inventoryItemId}>
                        {isSaving ? 'Saving...' : 'Save Order'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default OrderForm;