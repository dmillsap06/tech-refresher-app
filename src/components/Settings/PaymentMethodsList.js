import React, { useState, useEffect } from 'react';
import { getPaymentMethods, deletePaymentMethod, savePaymentMethod } from './paymentMethodsApi';
import EditPaymentMethodModal from './EditPaymentMethodModal';

export default function PaymentMethodsList({ userProfile }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);

  useEffect(() => {
    fetchMethods();
    // eslint-disable-next-line
  }, []);

  async function fetchMethods() {
    setLoading(true);
    try {
      const methods = await getPaymentMethods(userProfile.groupId);
      setPaymentMethods(methods);
    } catch (err) {
      alert('Failed to load payment methods.');
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
    if (window.confirm(`Delete ${method.nickname || method.type}?`)) {
      await deletePaymentMethod(userProfile.groupId, method.id);
      fetchMethods();
    }
  }

  function handleModalClose(saved) {
    setShowEditModal(false);
    setEditingMethod(null);
    if (saved) fetchMethods();
  }

  // Toggle active state directly from the list
  async function handleToggleActive(method) {
    await savePaymentMethod(userProfile.groupId, {
      ...method,
      active: !(method.active !== false), // undefined/true -> false, false -> true
    });
    fetchMethods();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300">Payment Methods</h2>
        <button
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          onClick={handleAdd}
        >Add Payment Method</button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : paymentMethods.length === 0 ? (
        <div className="text-gray-400">No payment methods defined. Add your first!</div>
      ) : (
        <table className="min-w-full text-sm border">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Nickname</th>
              <th className="px-2 py-1 text-left">Type</th>
              <th className="px-2 py-1 text-left">Last 4</th>
              <th className="px-2 py-1 text-left">Notes</th>
              <th className="px-2 py-1 text-center">Status</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map(m => (
              <tr key={m.id}>
                <td className="px-2 py-1">{m.nickname}</td>
                <td className="px-2 py-1">{m.type}</td>
                <td className="px-2 py-1">{m.lastFour}</td>
                <td className="px-2 py-1">{m.notes}</td>
                <td className="px-2 py-1 text-center">
                  {m.active !== false ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">
                      Active
                      <button
                        title="Set Inactive"
                        className="ml-2 px-1 py-0.5 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                        onClick={() => handleToggleActive(m)}
                      >Deactivate</button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-200 text-gray-600 text-xs font-semibold">
                      Inactive
                      <button
                        title="Set Active"
                        className="ml-2 px-1 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        onClick={() => handleToggleActive(m)}
                      >Activate</button>
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 flex gap-2">
                  <button
                    className="text-indigo-600 hover:underline"
                    onClick={() => handleEdit(m)}
                  >Edit</button>
                  <button
                    className="text-red-600 hover:underline"
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