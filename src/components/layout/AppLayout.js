import React from 'react';
import NavMenu from './NavMenu';

const AppLayout = ({ children, userProfile, onLogout, title }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                Tech Refresher
              </h1>
              {title && (
                <span className="ml-4 text-gray-500 dark:text-gray-400">
                  / {title}
                </span>
              )}
            </div>
            
            <NavMenu userProfile={userProfile} onLogout={onLogout} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;