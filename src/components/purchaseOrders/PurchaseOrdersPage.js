import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import PurchaseOrderForm from './PurchaseOrderForm';

const PurchaseOrdersPage = ({ userProfile, onBack, showNotification }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const poRef = collection(db, 'purchase_orders');
    const q = query(poRef, where('groupId', '==', userProfile.groupId), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchaseOrders(items);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userProfile?.groupId]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 flex items-center justify-between">
          <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
            &larr; Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Purchase Orders</h1>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Add New PO
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                {['PO #', 'Vendor', 'Date', 'Status', 'Total', 'Actions'].map(header => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading POs...</td></tr>
              ) : purchaseOrders.length > 0 ? purchaseOrders.map(po => (
                <tr key={po.id}>
                  <td className="px-6 py-4">{po.poNumber}</td>
                  <td className="px-6 py-4">{po.vendor}</td>
                  <td className="px-6 py-4">{po.date?.toDate().toLocaleDateString()}</td>
                  <td className="px-6 py-4">{po.status}</td>
                  <td className="px-6 py-4">${(po.total || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {/* TODO: Add View/Receive Actions */}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No purchase orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      {showAddModal && <PurchaseOrderForm userProfile={userProfile} onClose={() => setShowAddModal(false)} showNotification={showNotification} />}
    </div>
  );
};

export default PurchaseOrdersPage;