import React, { useState, useRef } from 'react';
import logError from '../../utils/logError';
import usePaymentMethods from './usePaymentMethods';

const inputClass = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-gray-700 dark:text-gray-100";

export default function MarkAsPaidModal({
  open,
  onClose,
  onSave,
  defaultAmount,
  defaultDate,
  loading,
  groupId,
  showNotification
}) {
  console.log("[MarkAsPaidModal] Initializing with props:", { 
    open, defaultAmount, defaultDate, loading, groupId 
  });
  
  const { methods, loading: methodsLoading } = usePaymentMethods(groupId);
  const [datePaid, setDatePaid] = useState(defaultDate || new Date().toISOString().substr(0, 10));
  const [amountPaid, setAmountPaid] = useState(defaultAmount !== undefined ? Number(defaultAmount).toFixed(2) : '');
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [internalError, setInternalError] = useState('');
  const errorReported = useRef(false);
  
  // Current date/time and username for display
  const currentDateTime = "2025-07-26 02:35:41";
  const currentUser = "dmillsap06";

  // Log when methods change
  React.useEffect(() => {
    console.log("[MarkAsPaidModal] Payment methods:", methods);
    console.log("[MarkAsPaidModal] Methods loading:", methodsLoading);
  }, [methods, methodsLoading]);

  // Filtering/Disabling: Only show methods with active !== false (default is active)
  const selectableMethods = methods.filter(m => m.active !== false);

  const handleSave = async () => {
    console.log("[MarkAsPaidModal] handleSave called");
    setTouched(true);
    setInternalError('');
    errorReported.current = false;
    
    // Basic validation checks
    if (!datePaid || !amountPaid || isNaN(Number(amountPaid)) || !methodId) {
      console.log("[MarkAsPaidModal] Validation failed:", {
        datePaid: !datePaid,
        amountPaid: !amountPaid,
        isNaN: isNaN(Number(amountPaid)),
        methodId: !methodId
      });
      return;
    }
    
    const methodObj = selectableMethods.find(m => m.id === methodId);
    if (!methodObj) {
      console.error("[MarkAsPaidModal] Method not found:", methodId);
      setInternalError('Invalid payment method selected');
      if (typeof showNotification === 'function') {
        showNotification('Invalid payment method selected', 'error');
      }
      return;
    }
    
    console.log("[MarkAsPaidModal] Method found:", methodObj);
    
    try {
      setLocalLoading(true);
      
      // Create the payment data object
      const paymentData = {
        datePaid,
        amountPaid: Number(amountPaid),
        method: {
          id: methodObj.id,
          type: methodObj.type || '',
          nickname: methodObj.nickname || '',
          lastFour: methodObj.lastFour || null,
          notes: methodObj.notes || null
        },
        reference: reference || '',
        notes: notes || '',
        recordedBy: currentUser,
        recordedAt: new Date().toISOString()
      };
      
      console.log("[MarkAsPaidModal] Payment data prepared:", JSON.stringify(paymentData, null, 2));
      
      // Try executing the save with better error handling
      try {
        console.log("[MarkAsPaidModal] Calling onSave function...");
        
        // Wrap onSave in a Promise.resolve to ensure it always returns a promise
        const result = await Promise.resolve(onSave(paymentData)).catch(err => {
          throw err; // Re-throw to be caught by outer catch
        });
        
        console.log("[MarkAsPaidModal] onSave result:", result);
        
        // Check if result indicates success - modify this condition based on your API
        if (result === false) {
          throw new Error("Payment recording failed silently");
        }
        
        // If we reach here, it was successful
        if (typeof showNotification === 'function') {
          showNotification('Payment recorded successfully', 'success');
        }
        
        // Close the modal
        onClose();
      } catch (saveError) {
        console.error("[MarkAsPaidModal] Error in onSave:", saveError);
        
        // Set internal error message
        setInternalError(saveError.message || 'Failed to record payment');
        
        // Log the error properly
        logError('MarkAsPaidModal-onSave', saveError, {
          userId: currentUser,
          groupId,
          methodId,
          payload: JSON.stringify({
            datePaid,
            amountPaid,
            methodId,
            hasReference: !!reference
          })
        });
        
        if (typeof showNotification === 'function') {
          showNotification(`Failed to record payment: ${saveError.message || 'Unknown error'}`, 'error');
        }
      }
    } catch (err) {
      console.error("[MarkAsPaidModal] Error preparing payment:", err);
      setInternalError('Error preparing payment data');
      
      logError('MarkAsPaidModal-preparePayment', err, {
        userId: currentUser,
        groupId,
        methodId,
        stage: 'preparation'
      });
      
      if (typeof showNotification === 'function') {
        showNotification('Error preparing payment data', 'error');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  if (!open) return null;

  // Use either the prop loading state or our local loading state
  const isLoading = loading || localLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-2 text-indigo-700 dark:text-indigo-300">Mark as Paid</h2>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {currentDateTime} • User: {currentUser}
        </div>
        
        {internalError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm">
            <strong>Error:</strong> {internalError}
          </div>
        )}
        
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Date Paid<span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="date"
            className={inputClass}
            value={datePaid}
            onChange={e => setDatePaid(e.target.value)}
          />
          {touched && !datePaid && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Date paid is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Amount Paid<span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={amountPaid}
            onChange={e => setAmountPaid(e.target.value)}
          />
          {touched && (!amountPaid || isNaN(Number(amountPaid))) && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Valid amount is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Payment Method<span className="text-red-500 dark:text-red-400">*</span></label>
          {methodsLoading ? (
            <div className="text-gray-600 dark:text-gray-400">Loading methods...</div>
          ) : selectableMethods.length === 0 ? (
            <div className="text-red-600 dark:text-red-400">No active payment methods available</div>
          ) : (
            <select
              className={inputClass}
              value={methodId}
              onChange={e => setMethodId(e.target.value)}
            >
              <option value="">Select a payment method</option>
              {selectableMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.nickname} ({method.type}{method.lastFour ? `, ****${method.lastFour}` : ''})
                  {method.active === false ? ' [Inactive]' : ''}
                </option>
              ))}
            </select>
          )}
          {touched && !methodId && <div className="text-red-600 dark:text-red-400 text-xs mt-1">Payment method is required.</div>}
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Reference / Transaction ID</label>
          <input
            type="text"
            className={inputClass}
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Notes</label>
          <textarea
            className={inputClass}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            onClick={onClose}
            disabled={isLoading}
          >Cancel</button>
          <button
            type="button"
            className={`px-5 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors ${isLoading ? 'opacity-60' : ''}`}
            disabled={isLoading || !datePaid || !amountPaid || isNaN(Number(amountPaid)) || !methodId}
            onClick={handleSave}
            data-testid="save-payment-button"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : 'Save'}
          </button>
        </div>
        {/* Optionally show details about the selected method */}
        {methodId && (() => {
          const m = selectableMethods.find(m => m.id === methodId);
          if (!m) return null;
          return (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-2">
              <div className="text-gray-700 dark:text-gray-300">Selected Payment Method:</div>
              <div className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{m.nickname}</span>
                {" "}
                ({m.type}{m.lastFour ? `, ****${m.lastFour}` : ''})
                {m.notes && <span> - {m.notes}</span>}
              </div>
              {m.active === false && (
                <div className="text-red-500 dark:text-red-400">This method is inactive and should not be used for future payments.</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}