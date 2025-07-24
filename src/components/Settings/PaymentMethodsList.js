import React, { useState, useEffect } from 'react';
import { getPaymentMethods, deletePaymentMethod, savePaymentMethod } from './paymentMethodsApi';
import EditPaymentMethodModal from './EditPaymentMethodModal';
import logError from '../../utils/logError';

export default function PaymentMethodsList({ userProfile, showNotification }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchMethods();
    // eslint-disable-next-line
  }, []);

  async function fetchMethods() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const methods = await getPaymentMethods(userProfile.groupId);
      setPaymentMethods(methods);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load payment methods.');
      logError('PaymentMethodsList-FetchMethods', err);
      if (showNotification) {
        showNotification(`Failed to load payment methods: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    setEditingMethod(null);
    setShowEditModal(true);
  }

  function handleEdit(method) {
    setEditingMethod(method);
    setShowEditModal(true);
  }

  async function handleDelete(method) {
    setErrorMsg(null);
    if (window.confirm(`Delete ${method.nickname || method.type}?`)) {
      try {
        await deletePaymentMethod(userProfile.groupId, method.id);
        fetchMethods();
        if (showNotification) {
          showNotification('Payment method deleted.', 'success');
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to delete payment method.');
        logError('PaymentMethodsList-Delete', err);
        if (showNotification) {
          showNotification(`Failed to delete payment method: ${err.message}`, 'error');
        }
      }
    }
  }

  function handleModalClose(saved) {
    setShowEditModal(false);
    setEditingMethod(null);
    if (saved) fetchMethods();
  }

  // Toggle active state directly from the list
  async function handleToggleActive(method) {
    setErrorMsg(null);
    try {
      await savePaymentMethod(userProfile.groupId, {
        ...method,
        active: !(method.active !== false), // undefined/true -> false, false -> true
      });
      fetchMethods();
      if (showNotification) {
        showNotification(
          `Payment method "${method.nickname}" is now ${method.active !== false ? 'inactive' : 'active'}.`,
          'success'
        );
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update payment method status.');
      logError('PaymentMethodsList-ToggleActive', err);
      if (showNotification) {
        showNotification(`Failed to update payment method status: ${err.message}`, 'error');
      }
    }
  }

  return (
    <div className="text-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300">Payment Methods</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          onClick={handleAdd}
        >Add Payment Method</button>
      </div>
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 rounded">
          Error: {errorMsg}
        </div>
      )}
      {loading ? (
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      ) : paymentMethods.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">No payment methods defined. Add your first!</div>
      ) : (
        <table className="min-w-full text-sm border border-gray-300 dark:border-gray-700 rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">Nickname</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">Type</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">Last 4</th>
              <th className="px-2 py-1 text-left font-semibold text-gray-700 dark:text-gray-200">Notes</th>
              <th className="px-2 py-1 text-center font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th className="px-2 py-1 font-semibold text-gray-700 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paymentMethods.map(m => (
              <tr key={m.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{m.nickname}</td>
                <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{m.type}</td>
                <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{m.lastFour}</td>
                <td className="px-2 py-1 text-gray-800 dark:text-gray-200">{m.notes}</td>
                <td className="px-2 py-1 text-center">
                  {m.active !== false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold">
                      Active
                      <button
                        title="Set Inactive"
                        className="ml-2 px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        onClick={() => handleToggleActive(m)}
                      >Deactivate</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold">
                      Inactive
                      <button
                        title="Set Active"
                        className="ml-2 px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded text-gray-700 dark:text-gray-300 transition-colors"
                        onClick={() => handleToggleActive(m)}
                      >Activate</button>
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 flex gap-2">
                  <button
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors"
                    onClick={() => handleEdit(m)}
                  >Edit</button>
                  <button
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:underline transition-colors"
                    onClick={() => handleDelete(m)}
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showEditModal && (
        <EditPaymentMethodModal
          open={showEditModal}
          onClose={handleModalClose}
          method={editingMethod}
          groupId={userProfile.groupId}
        />
      )}
    </div>
  );
}