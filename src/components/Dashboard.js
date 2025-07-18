import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import logError from '../utils/logError';

// --- Icon Components ---
const BanknotesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="7" width="20" height="10" rx="2" fill="currentColor" opacity="0.1"/>
    <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth={2}/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2}/>
    <path d="M7 10h.01M17 14h.01" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
  </svg>
);

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ArchiveBoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth={2} />
    <path d="M3 6l9 6 9-6" stroke="currentColor" strokeWidth={2} />
  </svg>
);

const ClipboardCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4-4m1-6H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2z" />
  </svg>
);

const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth={2} />
    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth={2} />
  </svg>
);

const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232a6 6 0 11-8.464 8.464m8.464-8.464L17 7M5.232 15.232L7 17" />
  </svg>
);

const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v2m0 12v2m8-8h2M4 12H2m15.364-6.364l1.414 1.414M6.343 17.657l-1.414 1.414m0-13.071l1.414 1.414M17.657 17.657l1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

const ShieldExclamationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5-3.8 9.5-8 11-4.2-1.5-8-6-8-11V7l8-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
  </svg>
);

const ClipboardDocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6M9 14h6" />
  </svg>
);

const Dashboard = ({ userProfile, onLogout, onNavigate }) => {
  const [financials, setFinancials] = useState({ totalRevenue: 0, netProfit: 0, onHandValue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Only superadmin can see settings and error log
  const isSuperAdmin = userProfile?.role === 'superadmin';

  useEffect(() => {
    if (!userProfile?.groupId) return;
    const inventoryCollectionRef = collection(db, 'inventory');
    const q = query(inventoryCollectionRef, where('groupId', '==', userProfile.groupId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalRevenue = 0;
      let netProfit = 0;
      let onHandValue = 0;

      snapshot.docs.forEach(doc => {
        const item = doc.data();
        if (item.status === 'Sold') {
          totalRevenue += item.finalSalePrice || 0;
          netProfit += item.netProfit || 0;
        } else { 
          onHandValue += item.totalCost || 0;
        }
      });

      setFinancials({ totalRevenue, netProfit, onHandValue });
      setIsLoading(false);
    }, (error) => {
      logError('Dashboard-FetchFinancials', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.groupId]);

  const capitalize = (s) => {
    if (typeof s !== 'string' || !s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatCurrency = (amount) => {
    if (isLoading) return "Calculating...";
    return `$${amount.toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Tech Refresher
          </h1>
          <div className="flex items-center">
            <span className="text-gray-700 dark:text-gray-300 mr-4 hidden sm:block">
              Welcome, {capitalize(userProfile.firstName)}!
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Financial Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center">
                <div className="mr-4">
                  <BanknotesIcon />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financials.totalRevenue)}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center">
                <div className="mr-4">
                  <TrendingUpIcon />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financials.netProfit)}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center">
                <div className="mr-4">
                  <ArchiveBoxIcon />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Value of On-Hand Inventory</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financials.onHandValue)}</p>
                </div>
              </div>

            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Manage</h2>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isSuperAdmin ? '7' : '5'} gap-6`}>
              <button onClick={() => onNavigate('orders')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <ClipboardCheckIcon />
                  <h3 className="ml-2 text-xl font-bold text-purple-600 dark:text-purple-400">Orders</h3>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Manage sales orders.</p>
              </button>
              <button onClick={() => onNavigate('inventory')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <BoxIcon />
                  <h3 className="ml-2 text-xl font-bold text-indigo-600 dark:text-indigo-400">Inventory</h3>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Manage devices and stock.</p>
              </button>
              <button onClick={() => onNavigate('parts')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <WrenchIcon />
                  <h3 className="ml-2 text-xl font-bold text-green-600 dark:text-green-400">Parts</h3>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Browse and manage parts.</p>
              </button>
              <button onClick={() => onNavigate('archived')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <ArchiveBoxIcon />
                  <h3 className="ml-2 text-xl font-bold text-yellow-600 dark:text-yellow-400">Archived</h3>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">View historical records.</p>
              </button>
              <button onClick={() => onNavigate('purchaseorders')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <ClipboardDocumentIcon />
                  <h3 className="ml-2 text-xl font-bold text-orange-600 dark:text-orange-400">Purchase Orders</h3>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">View, create, and receive purchase orders.</p>
              </button>
              {isSuperAdmin && (
                <>
                  <button onClick={() => onNavigate('settings')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <div className="flex items-center mb-2">
                      <CogIcon />
                      <h3 className="ml-2 text-xl font-bold text-gray-600 dark:text-gray-300">Settings</h3>
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      Manage app configuration, device types, colors, and user permissions.
                    </p>
                  </button>
                  <button onClick={() => onNavigate('errorlog')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <div className="flex items-center mb-2">
                      <ShieldExclamationIcon />
                      <h3 className="ml-2 text-xl font-bold text-red-600 dark:text-red-400">Error Log</h3>
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">View application errors.</p>
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;