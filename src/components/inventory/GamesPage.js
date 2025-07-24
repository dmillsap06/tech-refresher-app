import React from 'react';

const GamesPage = ({ userProfile, showNotification }) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="text-center py-16">
        <div className="mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Games</h2>
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

export default GamesPage;