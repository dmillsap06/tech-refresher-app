import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import PurchaseOrderForm from './PurchaseOrderForm';
import PODetailModal from './PODetailModal';
import logError from '../../utils/logError';

const PurchaseOrdersPage = ({ userProfile, showNotification, onBack }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.groupId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'purchase_orders'),
        where('groupId', '==', userProfile.groupId),
        orderBy('date', 'desc')
      );
      const unsub = onSnapshot(q, snapshot => {
        setPurchaseOrders(
          snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        );
        setLoading(false);
      }, err => {
        logError('PurchaseOrdersPage-List', err);
        setLoading(false);
        showNotification('Failed to load purchase orders: ' + err.message, 'error');
      });
      return () => unsub();
    } catch (err) {
      logError('PurchaseOrdersPage-List', err);
      setLoading(false);
      showNotification('Failed to load purchase orders: ' + err.message, 'error');
    }
  }, [userProfile, showNotification]);

  return (
    <div className="max-w-5xl mx-auto mt-8 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg min-h-[80vh]">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Purchase Orders</h1>
        <div>
          <button className="mr-2 px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={onBack}>Back</button>
          <button className="px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700" onClick={() => setShowForm(true)}>
            + New PO
          </button>
        </div>
      </div>
      {showForm && (
        <PurchaseOrderForm
          userProfile={userProfile}
          showNotification={showNotification}
          onClose={() => setShowForm(false)}
        />
      )}
      {selectedPO && (
        <PODetailModal
          po={selectedPO}
          userProfile={userProfile}
          showNotification={showNotification}
          onClose={() => setSelectedPO(null)}
        />
      )}
      {loading ? (
        <div className="text-center p-10 text-gray-400">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 text-left">PO #</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-left">Vendor Order #</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-8">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <td className="px-3 py-2">{po.poNumber || po.id.slice(-6).toUpperCase()}</td>
                    <td className="px-3 py-2">{po.vendor}</td>
                    <td className="px-3 py-2">{po.vendorOrderNumber || '-'}</td>
                    <td className="px-3 py-2">{po.date?.toDate?.().toLocaleDateString?.() || '-'}</td>
                    <td className="px-3 py-2">{po.status}</td>
                    <td className="px-3 py-2 text-right">${Number(po.total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="px-3 py-1 rounded bg-indigo-500 text-white text-sm hover:bg-indigo-700"
                        onClick={e => { e.stopPropagation(); setSelectedPO(po); }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersPage;