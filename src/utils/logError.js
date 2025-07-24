import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Logs errors to Firestore with enhanced information
 * Falls back to localStorage if Firestore permissions fail
 */
const logError = async (source, error, additionalData = {}) => {
  // Always log to console first
  console.error(`[${source}] Error:`, error);
  
  const errorData = {
    source,
    timestamp: new Date().toISOString(),
    message: error?.message || (typeof error === 'string' ? error : JSON.stringify(error)),
    stack: error?.stack || null,
    code: error?.code || null,
    userAgent: navigator.userAgent,
    userId: additionalData?.userId || 'anonymous',
    additionalInfo: additionalData || {},
  };
  
  // Try to get IP address
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    if (ipResponse.ok) {
      const ipData = await ipResponse.json();
      errorData.ipAddress = ipData.ip;
    }
  } catch (ipError) {
    console.warn('Unable to get IP address for error logging');
  }

  try {
    // Try Firestore first
    const docRef = await addDoc(collection(db, 'error_logs'), {
      ...errorData,
      timestamp: serverTimestamp(),
    });
    console.log('Error logged to Firestore:', docRef.id);
    return docRef.id;
  } catch (firestoreError) {
    console.warn('Failed to log to Firestore, using localStorage fallback:', firestoreError);
    
    // Fallback to localStorage
    try {
      const storedLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      storedLogs.push(errorData);
      localStorage.setItem('error_logs', JSON.stringify(storedLogs.slice(-50))); // Keep last 50 errors
      console.log('Error logged to localStorage');
    } catch (localStorageError) {
      console.error('Failed to log to localStorage:', localStorageError);
    }
    
    return null;
  }
};

export default logError;