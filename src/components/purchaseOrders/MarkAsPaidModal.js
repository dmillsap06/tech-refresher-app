import React, { useState, useRef, useEffect } from 'react';
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
  
  // Check if onSave is properly defined
  useEffect(() => {
    console.log("[MarkAsPaidModal] onSave function type:", typeof onSave);
    if (typeof onSave !== 'function') {
      console.error("[MarkAsPaidModal] onSave is not a function:", onSave);
      logError('MarkAsPaidModal-setup', new Error('onSave is not a function'), {
        onSaveType: typeof onSave
      });
    }
  }, [onSave]);
  
  const { methods, loading: methodsLoading } = usePaymentMethods(groupId);
  const [datePaid, setDatePaid] = useState(defaultDate || new Date().toISOString().substr(0, 10));
  const [amountPaid, setAmountPaid] = useState(defaultAmount !== undefined ? Number(defaultAmount).toFixed(2) : '');
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [internalError, setInternalError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const errorReported = useRef(false);
  const saveAttempted = useRef(false);
  
  // Current date/time and username for display
  const currentDateTime = "2025-07-26 02:40:26";
  const currentUser = "dmillsap06";

  // Log when methods change
  React.useEffect(() => {
    console.log("[MarkAsPaidModal] Payment methods:", methods);
    console.log("[MarkAsPaidModal] Methods loading:", methodsLoading);
  }, [methods, methodsLoading]);

  // Filtering/Disabling: Only show methods with active !== false (default is active)
  const selectableMethods = methods.filter(m => m.active !== false);

  // Debug helper to inspect parent component behavior
  const inspectParentOnSave = async (data) => {
    // Create a debugging info object
    const debugData = {
      callTime: new Date().toISOString(),
      functionType: typeof onSave,
      hasThrown: false,
      returnValue: 'pending',
      error: null,
      callStack: new Error().stack
    };
    
    try {
      // Call the parent's onSave function
      const result = await onSave(data);
      debugData.returnValue = result === undefined ? 'undefined' : JSON.stringify(result);
      return result;
    } catch (error) {
      debugData.hasThrown = true;
      debugData.error = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code
      };
      throw error;
    } finally {
      // Save debug info
      console.log("[MarkAsPaidModal] Parent onSave debug:", debugData);
      setDebugInfo(debugData);
    }
  };

  const handleSave = async () => {
    console.log("[MarkAsPaidModal] handleSave called");
    setTouched(true);
    setInternalError('');
    errorReported.current = false;
    saveAttempted.current = true;
    
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
      logError('MarkAsPaidModal-methodNotFound', new Error('Method not found'), { 
        methodId, 
        availableMethods: selectableMethods.map(m => m.id)
      });
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
      
      // Execute the save with enhanced debugging
      console.log("[MarkAsPaidModal] Calling onSave function...");
      
      try {
        // Use our instrumented version that captures more debug info
        const result = await inspectParentOnSave(paymentData);
        
        console.log("[MarkAsPaidModal] onSave result:", result);
        
        // Here we'll force error logging for the undefined case
        if (result === undefined) {
          // Log an error about the undefined result
          const undefinedError = new Error("Payment function returned undefined - possible silent failure");
          logError('MarkAsPaidModal-undefinedResult', undefinedError, {
            userId: currentUser,
            groupId,
            methodId,
            callStack: new Error().stack,
            paymentData: JSON.stringify(paymentData)
          });
          
          // Show error in UI but don't close modal
          setInternalError('Payment may not have been recorded properly. Please check if payment was applied before trying again.');
          
          if (typeof showNotification === 'function') {
            showNotification('Payment recording may have failed. Please verify before trying again.', 'warning');
          }
          
          return; // Don't close modal
        }
        
        // If we reach here with a defined result, it was successful
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

  // Effect to log errors when modal closes if payment was attempted
  useEffect(() => {
    return () => {
      if (saveAttempted.current && !errorReported.current) {
        // Log that the modal was closed after a save attempt without success confirmation
        logError('MarkAsPaidModal-lifecycle', new Error('Modal closed without confirmed success after save attempt'), {
          userId: currentUser,
          groupId,
          debugInfo: debugInfo
        });
      }
    };
  }, [currentUser, groupId, debugInfo]);

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
        
        {debugInfo && debugInfo.hasThrown && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-500 text-orange-700 dark:text-orange-300 text-xs">
            <details>
              <summary className="font-semibold cursor-pointer">Technical Details</summary>
              <pre className="mt-2 overflow-auto max-h-32">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
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
        
        {/* Selected method details */}
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