import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import logError from '../utils/logError';

// Import all icons from the icons index file
import {
  BanknotesIcon,
  TrendingUpIcon,
  ArchiveBoxIcon,
  ClipboardCheckIcon,
  BoxIcon,
  WrenchIcon,
  CogIcon,
  ShieldExclamationIcon,
  ClipboardDocumentIcon
} from './icons';

const Dashboard = ({ userProfile, onLogout, onNavigate }) => {
  const [financials, setFinancials] = useState({ totalRevenue: 0, netProfit: 0, onHandValue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Only superadmin can see settings and error log
  const isSuperAdmin = userProfile?.role === 'superadmin';

  // Function to format date as "January 1st, 2025 11:30AM EST"
  const getFormattedDate = () => {
    const now = new Date();
    const options = {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    };
    
    const timeStr = new Intl.DateTimeFormat('en-US', options).format(now);
    
    const dateOptions = {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    const dateStr = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    
    // Add the ordinal suffix (st, nd, rd, th) to the day
    const dayMatch = dateStr.match(/(\d+),/);
    if (dayMatch && dayMatch[1]) {
      const day = parseInt(dayMatch[1], 10);
      let suffix = 'th';
      
      if (day % 10 === 1 && day !== 11) {
        suffix = 'st';
      } else if (day % 10 === 2 && day !== 12) {
        suffix = 'nd';
      } else if (day % 10 === 3 && day !== 13) {
        suffix = 'rd';
      }
      
      // Replace the day number with day + suffix
      const formattedDate = dateStr.replace(/(\d+),/, `$1${suffix},`);
      return `${formattedDate} ${timeStr} EST`;
    }
    
    return `${dateStr} ${timeStr} EST`;
  };

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

  const formatCurrency = (amount) => {
    if (isLoading) return "Calculating...";
    return `$${amount.toFixed(2)}`;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
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
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isSuperAdmin ? '4' : '3'} gap-6`}>
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