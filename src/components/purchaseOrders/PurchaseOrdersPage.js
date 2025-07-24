import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import PurchaseOrderForm from './PurchaseOrderForm';
import PODetailModal from './PODetailModal';
import logError from '../../utils/logError';

// Status badges with consistent styling as PODetailModal
const statusInfo = {
  "Created":   { color: "bg-blue-100 text-blue-700", emoji: "📝", label: "Created" },
  "Partially Received": { color: "bg-yellow-100 text-yellow-800", emoji: "📦", label: "Partial" },
  "Received":  { color: "bg-green-100 text-green-700", emoji: "✅", label: "Received" },
  "Cancelled": { color: "bg-gray-200 text-gray-500", emoji: "❌", label: "Cancelled" },
  "Paid":      { color: "bg-indigo-100 text-indigo-700", emoji: "💸", label: "Paid" },
  "Shipped":   { color: "bg-blue-100 text-blue-700", emoji: "🚚", label: "Shipped" },
  "Partially Shipped": { color: "bg-yellow-100 text-yellow-800", emoji: "📦", label: "Partial Ship" },
  "Archived":  { color: "bg-gray-200 text-gray-600", emoji: "📁", label: "Archived" }
};

const capitalize = (s) => {
  if (typeof s !== 'string' || !s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
};

const StatusBadge = ({ status }) => {
  const { color, emoji, label } = statusInfo[status] || { 
    color: "bg-gray-200 text-gray-600", 
    emoji: "❓", 
    label: status 
  };
  
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      <span className="mr-1">{emoji}</span>
      {label}
    </span>
  );
};

const PurchaseOrdersPage = ({ userProfile, showNotification, onBack, onLogout }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  const errorReported = useRef(false);
  const unsubRef = useRef(null);
  const queryParamsRef = useRef({ field: sortField, direction: sortDirection });

  // Update query params in ref when they change
  useEffect(() => {
    queryParamsRef.current = { field: sortField, direction: sortDirection };
  }, [sortField, sortDirection]);

  useEffect(() => {
    // If we don't have a group ID or are already subscribed, don't proceed
    if (!userProfile?.groupId) return;
    
    // Clean up any existing subscription
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    
    // Only set loading to true when we're first mounting or the group changes
    setLoading(true);
    
    // Reset the error flag only when changing groups or remounting
    errorReported.current = false;
    
    const setupSubscription = () => {
      try {
        const q = query(
          collection(db, 'purchase_orders'),
          where('groupId', '==', userProfile.groupId),
          orderBy(queryParamsRef.current.field, queryParamsRef.current.direction),
          limit(100)
        );
        
        unsubRef.current = onSnapshot(q, snapshot => {
          setPurchaseOrders(
            snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          );
          setLoading(false);
        }, err => {
          // Only log and notify about errors once
          if (!errorReported.current) {
            logError('PurchaseOrdersPage-List', err);
            setLoading(false);
            showNotification('Failed to load purchase orders: ' + err.message, 'error');
            errorReported.current = true;
          }
        });
      } catch (err) {
        // Only log and notify about errors once
        if (!errorReported.current) {
          logError('PurchaseOrdersPage-List', err);
          setLoading(false);
          showNotification('Failed to load purchase orders: ' + err.message, 'error');
          errorReported.current = true;
        }
      }
    };
    
    setupSubscription();
    
    // Clean up subscription on unmount
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [userProfile?.groupId, showNotification]); // Only depend on groupId and notification function

  // Handle sort changes by updating the query
  useEffect(() => {
    if (!userProfile?.groupId || !unsubRef.current) return;
    
    // Clean up existing subscription
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    
    try {
      const q = query(
        collection(db, 'purchase_orders'),
        where('groupId', '==', userProfile.groupId),
        orderBy(sortField, sortDirection),
        limit(100)
      );
      
      unsubRef.current = onSnapshot(q, snapshot => {
        setPurchaseOrders(
          snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        );
        setLoading(false);
      }, err => {
        // Don't need to report errors here as they're already handled in the main subscription
        setLoading(false);
      });
    } catch (err) {
      // Don't need to report errors here as they're already handled in the main subscription
      setLoading(false);
    }
  }, [sortField, sortDirection, userProfile?.groupId]);

  // Handle PO updates from detail modal
  const handlePOUpdated = (updatedPO) => {
    setPurchaseOrders(prevPOs => 
      prevPOs.map(po => po.id === updatedPO.id ? updatedPO : po)
    );
  };

  // Filter POs based on search term and status filter
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = !searchTerm || 
        po.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendorOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = !statusFilter || po.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, searchTerm, statusFilter]);

  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique statuses for filter dropdown
  const statuses = useMemo(() => {
    const uniqueStatuses = new Set(purchaseOrders.map(po => po.status));
    return Array.from(uniqueStatuses).sort();
  }, [purchaseOrders]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
            <button 
              onClick={onBack} 
              className="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            >
              &larr;
            </button>
            Tech Refresher
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 dark:text-gray-300 hidden sm:block">
              Welcome, {capitalize(userProfile.firstName)}!
            </span>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
          {/* Page Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Orders</h2>
              <button 
                className="px-4 py-2 rounded-md bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                onClick={() => setShowForm(true)}
              >
                + New Purchase Order
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="p-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search POs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* Purchase Orders Table */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {filteredPOs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No purchase orders found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Get started by creating a new purchase order'}
                  </p>
                  {!searchTerm && !statusFilter && (
                    <div className="mt-6">
                      <button
                        onClick={() => setShowForm(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        + New Purchase Order
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('id')}
                      >
                        PO # {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('vendor')}
                      >
                        Vendor {sortField === 'vendor' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('date')}
                      >
                        Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th 
                        scope="col" 
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('total')}
                      >
                        Total {sortField === 'total' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPOs.map(po => (
                      <tr 
                        key={po.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                        onClick={() => setSelectedPO(po)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {po.poNumber || po.id.slice(-6).toUpperCase()}
                          {po.vendorOrderNumber && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Vendor #: {po.vendorOrderNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {po.vendor}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(po.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {formatMoney(po.total)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="px-3 py-1 inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPO(po);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showForm && (
        <PurchaseOrderForm
          userProfile={userProfile}
          showNotification={showNotification}
          onClose={() => setShowForm(false)}
        />
      )}
      
      {selectedPO && (
        <PODetailModal
          po={selectedPO}
          userProfile={userProfile}
          showNotification={showNotification}
          onClose={() => setSelectedPO(null)}
          onPOUpdated={handlePOUpdated}
        />
      )}
    </div>
  );
};

export default PurchaseOrdersPage;