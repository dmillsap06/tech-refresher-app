import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Logs an error to the 'error_logs' collection in Firestore.
 * @param {string} location - A string indicating where in the code the error occurred (e.g., 'InventoryForm-Save').
 * @param {Error} error - The error object caught in the catch block.
 */
const logError = async (location, error) => {
    try {
        const logsCollectionRef = collection(db, 'error_logs');
        await addDoc(logsCollectionRef, {
            userId: auth.currentUser?.uid || 'anonymous',
            location: location,
            errorMessage: error.message, // Log the error's message
            errorStack: error.stack, // Log the full stack trace for debugging
            timestamp: serverTimestamp(),
            userAgent: navigator.userAgent // Log browser info
        });
    } catch (loggingError) {
        // If logging to Firestore fails, log both errors to the console.
        console.error("Failed to log error to Firestore:", loggingError);
        console.error("Original Error:", error);
    }
};

export default logError;