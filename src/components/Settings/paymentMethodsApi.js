import { db } from '../../firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

// Get all payment methods for a group/organization
export async function getPaymentMethods(groupId) {
  const colRef = collection(db, 'groups', groupId, 'paymentMethods');
  const snap = await getDocs(colRef);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// Save (add or update) a payment method
export async function savePaymentMethod(groupId, method) {
  const { id, ...data } = method;
  let docRef;
  if (id) {
    docRef = doc(db, 'groups', groupId, 'paymentMethods', id);
  } else {
    // Let Firestore auto-generate ID
    docRef = doc(collection(db, 'groups', groupId, 'paymentMethods'));
  }
  await setDoc(docRef, data, { merge: true });
}

// Delete a payment method
export async function deletePaymentMethod(groupId, id) {
  const docRef = doc(db, 'groups', groupId, 'paymentMethods', id);
  await deleteDoc(docRef);
}