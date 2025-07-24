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
      // Silently fail if IP lookup doesn't work
      console.warn('Unable to get IP address for error logging');
    }

    // Format the error object
    const errorData = {
      source,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      message: error?.message || JSON.stringify(error),
      stack: error?.stack || null,
      code: error?.code || null,
      ipAddress,
      userAgent: navigator.userAgent,
      userId: additionalData?.userId || 'anonymous',
      location: source,
      errorMessage: error?.message || JSON.stringify(error),
      additionalData: additionalData || {},
    };

    // Log to Firestore
    await addDoc(collection(db, 'error_logs'), errorData);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[${source}]`, error, additionalData);
    }
  } catch (loggingError) {
    // If error logging fails, log to console as fallback
    console.error('Error logging failed:', loggingError);
    console.error('Original error:', source, error, additionalData);
  }
};

export default logError;