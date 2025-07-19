import { useEffect, useState } from 'react';
import { getPaymentMethods } from '../Settings/paymentMethodsApi';
import logError from '../../utils/logError';

// This hook fetches the organization's payment methods for use in PO flows.
// Pass in groupId from the user's profile/context.
export default function usePaymentMethods(groupId) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    getPaymentMethods(groupId)
      .then(setMethods)
      .catch((err) => {
        setMethods([]);
        logError && logError('usePaymentMethods-fetch', err);
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  return { methods, loading };
}