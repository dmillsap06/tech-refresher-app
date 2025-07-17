import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import logError from '../utils/logError';

// --- Icon Components ---
const DollarSignIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 6v1m0-10a9 9 0 110 18 9 9 0 010-18z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ArchiveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
);

const CogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426[...]
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ShieldExclamationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-[...]
    </svg>
);

const Dashboard = ({ userProfile, onLogout, onNavigate }) => {
  const [financials, setFinancials] = useState({ totalRevenue: 0, netProfit: 0, onHandValue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Only superadmin can see error log and catalog
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
                  <DollarSignIcon />
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
                  <ArchiveIcon />
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
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isSuperAdmin ? '6' : '4'} gap-6`}>
                <button onClick={() => onNavigate('orders')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400">Orders</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Manage sales orders.</p>
                </button>
                <button onClick={() => onNavigate('inventory')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Inventory</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Manage devices and stock.</p>
                </button>
                <button onClick={() => onNavigate('parts')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <h3 className="text-xl font-bold text-green-600 dark:text-green-400">Parts</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Browse and manage parts.</p>
                </button>
                <button onClick={() => onNavigate('archived')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <h3 className="text-xl font-bold text-yellow-600 dark:text-yellow-400">Archived</h3>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">View historical records.</p>
                </button>
                {/* --- Super Admin Only: Settings & Error Log --- */}
                {isSuperAdmin && (
                  <>
                    <button onClick={() => onNavigate('settings')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                        <div className="flex items-center">
                            <CogIcon/>
                            <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">Catalog</h3>
                        </div>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">Manage device types and colors.</p>
                    </button>
                    <button onClick={() => onNavigate('errorlog')} className="group text-left p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                        <div className="flex items-center">
                            <ShieldExclamationIcon/>
                            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Error Log</h3>
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