import { db } from '../../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import logError from '../../utils/logError';

// Get all payment methods for a group/organization
export async function getPaymentMethods(groupId) {
  try {
    const colRef = collection(db, 'groups', groupId, 'paymentMethods');
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    await logError('paymentMethodsApi-getPaymentMethods', err);
    throw err;
  }
}

// Save (add or update) a payment method
export async function savePaymentMethod(groupId, method) {
  const { id, ...data } = method;
  let docRef;
  try {
    if (id) {
      docRef = doc(db, 'groups', groupId, 'paymentMethods', id);
    } else {
      // Let Firestore auto-generate ID
      docRef = doc(collection(db, 'groups', groupId, 'paymentMethods'));
    }
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    await logError('paymentMethodsApi-savePaymentMethod', err);
    throw err;
  }
}

// Delete a payment method
export async function deletePaymentMethod(groupId, id) {
  try {
    const docRef = doc(db, 'groups', groupId, 'paymentMethods', id);
    await deleteDoc(docRef);
  } catch (err) {
    await logError('paymentMethodsApi-deletePaymentMethod', err);
    throw err;
  }
}