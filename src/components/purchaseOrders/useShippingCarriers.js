import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// Usage: const { carriers, loading } = useShippingCarriers(groupId);
export default function useShippingCarriers(groupId) {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const q = query(collection(db, 'shipping_carriers'), where('groupId', '==', groupId));
    getDocs(q)
      .then(snapshot => setCarriers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))))
      .catch(() => setCarriers([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  return { carriers, loading };
}