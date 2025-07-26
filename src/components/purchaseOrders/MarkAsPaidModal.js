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
  const { methods, loading: methodsLoading } = usePaymentMethods(groupId);
  const [datePaid, setDatePaid] = useState(defaultDate || new Date().toISOString().substr(0, 10));
  const [amountPaid, setAmountPaid] = useState(defaultAmount !== undefined ? Number(defaultAmount).toFixed(2) : '');
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'warning', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const errorReported = useRef(false);
  
  // Current date/time and username for display
  const currentDateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const currentUser = "dmillsap06";

  // Filtering/Disabling: Only show methods with active !== false (default is active)
  const selectableMethods = methods.filter(m => m.active !== false);

  const handleSave = async () => {
    setTouched(true);
    errorReported.current = false;
    setPaymentStatus(null);
    setStatusMessage('');
    
    // Basic validation checks
    if (!datePaid || !amountPaid || isNaN(Number(amountPaid)) || !methodId) {
      return;
    }
    
    const methodObj = selectableMethods.find(m => m.id === methodId);
    if (!methodObj) {
      setPaymentStatus('error');
      setStatusMessage('Invalid payment method selected');
      
      logError('MarkAsPaidModal-methodNotFound', new Error('Method not found'), { 
        methodId, 
        availableMethods: selectableMethods.map(m => m.id)
      });
      
      if (typeof showNotification === 'function') {
        showNotification('Invalid payment method selected', 'error');
      }
      return;
    }
    
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
      
      try {
        // Call the parent's onSave function
        const result = await onSave(paymentData);
        
        // Handle the undefined return case (parent component issue)
        if (result === undefined) {
          // Log the issue
          logError('MarkAsPaidModal-undefinedResult', new Error('Payment function returned undefined - possible silent failure'), {
            userId: currentUser,
            groupId,
            methodId,
            paymentData: JSON.stringify(paymentData)
          });
          
          // Show warning to user but don't close modal
          setPaymentStatus('warning');
          setStatusMessage('Payment may have been recorded, but confirmation failed. Please check if the payment appears before trying again.');
          
          if (typeof showNotification === 'function') {
            showNotification('Payment status uncertain - please check before trying again', 'warning');
          }
          
          return; // Don't close modal
        }
        
        // If we have a specific result, use it
        if (result === false) {
          throw new Error('Payment recording failed');
        }
        
        // Success case
        setPaymentStatus('success');
        setStatusMessage('Payment recorded successfully!');
        
        if (typeof showNotification === 'function') {
          showNotification('Payment recorded successfully', 'success');
        }
        
        // Close the modal on success after a brief delay to show the success message
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (saveError) {
        // Handle explicit errors
        setPaymentStatus('error');
        setStatusMessage(saveError.message || 'Failed to record payment');
        
        logError('MarkAsPaidModal-onSave', saveError, {
          userId: currentUser,
          groupId,
          methodId,
          paymentData: JSON.stringify(paymentData)
        });
        
        if (typeof showNotification === 'function') {
          showNotification(`Failed to record payment: ${saveError.message || 'Unknown error'}`, 'error');
        }
      }
    } catch (err) {
      setPaymentStatus('error');
      setStatusMessage('Error preparing payment data');
      
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

  // Helper for status background colors
  const getStatusBg = () => {
    switch(paymentStatus) {
      case 'success': return 'bg-green-50 dark:bg-green-900/30 border-green-500';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500';
      case 'error': return 'bg-red-50 dark:bg-red-900/30 border-red-500';
      default: return '';
    }
  };
  
  // Helper for status text colors
  const getStatusText = () => {
    switch(paymentStatus) {
      case 'success': return 'text-green-700 dark:text-green-300';
      case 'warning': return 'text-yellow-700 dark:text-yellow-300';
      case 'error': return 'text-red-700 dark:text-red-300';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-2 text-indigo-700 dark:text-indigo-300">Mark as Paid</h2>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {currentDateTime} • User: {currentUser}
        </div>
        
        {paymentStatus && (
          <div className={`mb-4 p-3 border-l-4 ${getStatusBg()} ${getStatusText()} text-sm`}>
            <strong>
              {paymentStatus === 'success' ? 'Success: ' : 
               paymentStatus === 'warning' ? 'Warning: ' : 'Error: '}
            </strong>
            {statusMessage}
          </div>
        )}
        
        <div className="mb-3">
          <label className="block font-medium mb-1 text-gray-800 dark:text-gray-200">Date Paid<span className="text-red-500 dark:text-red-400">*</span></label>
          <input
            type="date"
            className={inputClass}
            value={datePaid}
            onChange={e => setDatePaid(e.target.value)}
            disabled={paymentStatus === 'success'}
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
            disabled={paymentStatus === 'success'}
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
              disabled={paymentStatus === 'success'}
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
            disabled={paymentStatus === 'success'}
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
            disabled={paymentStatus === 'success'}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            onClick={onClose}
            disabled={isLoading}
          >
            {paymentStatus === 'success' ? 'Close' : 'Cancel'}
          </button>
          
          {paymentStatus !== 'success' && (
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
          )}
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