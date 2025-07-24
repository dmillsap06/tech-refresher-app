import React from 'react';
import appVersion from '../../utils/appVersion';

const Changelog = ({ userProfile }) => {
  // Only super admins can access this page
  if (!userProfile?.isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 dark:text-gray-300">
            You don't have permission to view the changelog. This page is only accessible to super administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-6">
          Tech Refresher Changelog
        </h1>
        
        <div className="mb-4">
          <p className="text-gray-500 dark:text-gray-400">
            Current version: <span className="font-semibold text-gray-700 dark:text-gray-300">v{appVersion.version}</span>
            <span className="text-sm ml-2">({appVersion.lastUpdated})</span>
          </p>
        </div>
        
        <div className="space-y-8">
          {appVersion.versionHistory.map((version, idx) => (
            <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded text-sm mr-3">
                  v{version.version}
                </span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  {version.date}
                </span>
              </h2>
              
              <ul className="mt-4 space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300">
                {version.changes.map((change, changeIdx) => (
                  <li key={changeIdx}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Changelog;