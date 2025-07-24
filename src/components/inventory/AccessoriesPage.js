import React from 'react';

const AccessoriesPage = ({ userProfile, showNotification }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="text-center py-16">
        <div className="mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accessories</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This feature is currently under development and will be available soon.
        </p>
        <p className="text-sm text-indigo-600 dark:text-indigo-400">
          Check back for updates in the next release.
        </p>
      </div>
    </div>
  );
};

export default AccessoriesPage;