import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import appVersion from '../../utils/appVersion';

const NavMenu = ({ userProfile, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
  
  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Purchase Orders', path: '/purchase-orders' },
    { name: 'Inventory', path: '/inventory' },
    { name: 'Repairs', path: '/repairs' },
    { name: 'Customers', path: '/customers' },
    { name: 'Settings', path: '/settings' }
  ];
  
  // Add Admin section only for admin users
  if (userProfile?.isAdmin || userProfile?.isSuperAdmin) {
    navLinks.push({ name: 'Admin', path: '/admin' });
  }
  
  // Changelog only visible to super admins
  if (userProfile?.isSuperAdmin) {
    navLinks.push({ name: 'Changelog', path: '/changelog' });
  }
  
  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-4">
        {navLinks.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(link.path)
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {link.name}
          </Link>
        ))}
        
        {/* User dropdown with logout */}
        <div className="relative ml-3">
          <div className="flex items-center">
            <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
              {userProfile?.displayName || userProfile?.email}
            </span>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Version number - small and discrete */}
        <div className="text-xs text-gray-400 dark:text-gray-600 ml-2">
          v{appVersion.version}
        </div>
      </nav>
      
      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Tech Refresher</h2>
            <button onClick={() => setIsOpen(false)}>
              <FiX size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-3 rounded-md text-base font-medium ${
                    isActive(link.path)
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {userProfile?.displayName || userProfile?.email}
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-600 mt-2">
              v{appVersion.version}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavMenu;