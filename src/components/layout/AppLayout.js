import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import appVersion from '../../utils/appVersion';

const AppLayout = ({ children, userProfile, onLogout, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleOrders = (e) => {
    e.preventDefault();
    setOrdersExpanded(!ordersExpanded);
  };

  const toggleInventory = (e) => {
    e.preventDefault();
    setInventoryExpanded(!inventoryExpanded);
  };

  // Function to determine if a link is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Function to determine if a sub-menu is active
  const isSubMenuActive = (paths) => {
    return paths.some(path => location.pathname.startsWith(path));
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-md transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Tech Refresher</h1>
          <button onClick={toggleSidebar} className="p-1 rounded-md md:hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            <FiX className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <nav className="mt-5 px-2 space-y-1">
          {/* Dashboard */}
          <Link 
            to="/" 
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isActive('/') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </Link>

          {/* Orders Menu */}
          <div>
            <a 
              href="#" 
              onClick={toggleOrders} 
              className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${isSubMenuActive(['/purchase-orders', '/customer-orders', '/archived-orders']) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isSubMenuActive(['/purchase-orders', '/customer-orders', '/archived-orders']) ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
                </svg>
                Orders
              </div>
              {ordersExpanded ? <FiChevronDown className="h-5 w-5" /> : <FiChevronRight className="h-5 w-5" />}
            </a>
            
            {ordersExpanded && (
              <div className="pl-8 pr-2 space-y-1">
                <Link 
                  to="/purchase-orders" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/purchase-orders') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Purchase Orders
                </Link>
                <Link 
                  to="/customer-orders" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/customer-orders') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Customer Orders
                </Link>
                <Link 
                  to="/archived-orders" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/archived-orders') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Archived Orders
                </Link>
              </div>
            )}
          </div>

          {/* Repairs */}
          <Link 
            to="/repairs" 
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/repairs') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isActive('/repairs') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Repairs
          </Link>

          {/* Inventory Menu */}
          <div>
            <a 
              href="#" 
              onClick={toggleInventory} 
              className={`group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md ${isSubMenuActive(['/inventory', '/devices', '/parts', '/accessories', '/games']) ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isSubMenuActive(['/inventory', '/devices', '/parts', '/accessories', '/games']) ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Inventory
              </div>
              {inventoryExpanded ? <FiChevronDown className="h-5 w-5" /> : <FiChevronRight className="h-5 w-5" />}
            </a>
            
            {inventoryExpanded && (
              <div className="pl-8 pr-2 space-y-1">
                <Link 
                  to="/devices" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/devices') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Devices
                </Link>
                <Link 
                  to="/parts" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/parts') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Parts
                </Link>
                <Link 
                  to="/accessories" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/accessories') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Accessories
                </Link>
                <Link 
                  to="/games" 
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/games') ? 'bg-indigo-50 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Games
                </Link>
              </div>
            )}
          </div>

          {/* Customers */}
          <Link 
            to="/customers" 
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/customers') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isActive('/customers') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            Customers
          </Link>

          {/* Settings */}
          <Link 
            to="/settings" 
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/settings') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isActive('/settings') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>

          {/* Admin link for admin users */}
          {userProfile?.isAdmin && (
            <Link 
              to="/admin" 
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/admin') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isActive('/admin') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Admin
            </Link>
          )}

          {/* Changelog link for super admins */}
          {userProfile?.isSuperAdmin && (
            <Link 
              to="/changelog" 
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive('/changelog') ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`mr-3 h-5 w-5 ${isActive('/changelog') ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
              </svg>
              Changelog
            </Link>
          )}
        </nav>

        {/* Version info at bottom of sidebar */}
        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Version: {appVersion.version}</p>
            <p>Last Updated: {appVersion.lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 shadow">
          <button onClick={toggleSidebar} className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 md:hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
            <FiMenu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              {/* Current time and user info */}
              <div className="text-sm text-gray-500 dark:text-gray-400 mr-4 hidden md:block">
                <p>{new Date().toISOString().replace('T', ' ').substring(0, 19)}</p>
                <p className="text-right">{userProfile?.displayName || userProfile?.email}</p>
              </div>

              {/* Profile dropdown */}
              <div className="ml-3 relative">
                <div>
                  <button
                    onClick={onLogout}
                    className="max-w-xs bg-gray-100 dark:bg-gray-700 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="sr-only">Log out</span>
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;