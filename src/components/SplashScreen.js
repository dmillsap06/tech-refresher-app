import React from 'react';

const SplashScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-indigo-100 dark:bg-gray-900">
    <div className="flex flex-col items-center">
      {/* Use your app's logo here or remove if not needed */}
      <img src="/logo192.png" alt="App Logo" className="w-24 h-24 mb-4 animate-spin" />
      <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-300 mb-2">Tech Refresher</h1>
      <p className="text-gray-500 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

export default SplashScreen;