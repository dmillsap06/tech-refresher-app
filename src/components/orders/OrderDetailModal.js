import React from 'react';
import Modal from '../common/Modal'; // Import the reusable Modal

const OrderDetailModal = ({ order, onClose }) => {
    if (!order) return null;

    const mainItem = order.soldItemDetails;
    const extraParts = order.soldParts || [];
    const extraPartsCost = order.extraPartsCost || 0;

    return (
        <Modal isOpen={true} onClose={onClose} widthClass="max-w-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Order Details</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Order #{order.orderNumber} on {order.platform}</p>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
                {/* --- Financial Summary --- */}
                <div>
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Financial Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="font-medium text-gray-600 dark:text-gray-400">Total Sale:</div>
                        <div className="text-green-600 dark:text-green-400 font-semibold">${(order.totalPaid || 0).toFixed(2)}</div>
                        
                        <div className="font-medium text-gray-600 dark:text-gray-400">Platform Fee:</div>
                        <div>-${(order.platformFee || 0).toFixed(2)}</div>

                        <div className="font-medium text-gray-600 dark:text-gray-400">Shipping Cost:</div>
                        <div>-${(order.shippingCost || 0).toFixed(2)}</div>

                        <div className="font-medium text-gray-600 dark:text-gray-400">Packing Cost:</div>
                        <div>-${(order.packingCost || 0).toFixed(2)}</div>
                        
                        <div className="font-medium text-gray-600 dark:text-gray-400">Item Cost:</div>
                        <div>-${(mainItem.totalCost || 0).toFixed(2)}</div>
                        
                        <div className="font-medium text-gray-600 dark:text-gray-400">Extra Parts Cost:</div>
                        <div>-${extraPartsCost.toFixed(2)}</div>
                        
                        <div className="col-span-2 border-t border-gray-200 dark:border-gray-700 my-2"></div>

                        <div className="font-bold text-gray-800 dark:text-white">Net Profit:</div>
                        <div className="font-bold text-green-600 dark:text-green-400">${(order.netProfit || 0).toFixed(2)}</div>
                    </div>
                </div>

                {/* --- Items Sold --- */}
                <div>
                    <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Items Sold</h4>
                    <ul className="space-y-2">
                        <li className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{mainItem.brand} {mainItem.device} - {mainItem.color}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">SN: {mainItem.serialNumber}</p>
                        </li>
                        {extraParts.map(part => (
                            <li key={part.id} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700/50">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{part.partName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{part.brand} {part.device} - {part.color}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 flex justify-end">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300">Close</button>
            </div>
        </Modal>
    );
};

export default OrderDetailModal;