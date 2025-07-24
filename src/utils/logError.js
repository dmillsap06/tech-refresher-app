import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs errors to Firestore with enhanced information including IP address when available
 * @param {string} source - The source of the error (component/function name)
 * @param {Error|Object} error - The error object or data to log
 * @param {Object} additionalData - Any additional data to include in the log
 * @returns {Promise<void>}
 */
const logError = async (source, error, additionalData = {}) => {
  // Always log to console first to ensure we see errors even if Firestore logging fails
  console.error(`[${source}] Error:`, error);
  console.error('Additional data:', additionalData);
  
  try {
    // Get client IP address when possible using a free IP lookup service
    let ipAddress = 'unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      }
    } catch (ipError) {
      console.warn('Unable to get IP address for error logging', ipError);
    }

    // Format the error object
    const errorData = {
      source,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      message: error?.message || (typeof error === 'string' ? error : JSON.stringify(error)),
      stack: error?.stack || null,
      code: error?.code || null,
      ipAddress,
      userAgent: navigator.userAgent,
      userId: additionalData?.userId || 'anonymous',
      location: source,
      errorMessage: error?.message || (typeof error === 'string' ? error : JSON.stringify(error)),
      additionalData: additionalData || {},
    };

    console.log('Attempting to save error log to Firestore:', errorData);
    
    // Log to Firestore
    const docRef = await addDoc(collection(db, 'error_logs'), errorData);
    console.log('Error successfully logged to Firestore with ID:', docRef.id);
    
    return docRef.id;
  } catch (loggingError) {
    // If error logging fails, log to console as fallback
    console.error('Failed to log error to Firestore:', loggingError);
    console.error('Original error:', source, error, additionalData);
    return null;
  }
};

export default logError;