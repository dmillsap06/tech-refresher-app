import React, { useState } from 'react';
import CatalogBrands from './CatalogBrands';
import CatalogDeviceTypes from './CatalogDeviceTypes';
import CatalogParts from './CatalogParts';
import CatalogAccessories from './CatalogAccessories';
import CatalogGames from './CatalogGames'; // <-- Import the Games component

const CATALOG_TABS = [
  { id: 'brands', label: 'Brands' },
  { id: 'deviceTypes', label: 'Device Types' },
  { id: 'parts', label: 'Parts' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'games', label: 'Games' }, // <-- Add Games tab
];

const SettingsCatalog = ({ userProfile, showNotification }) => {
  const [activeTab, setActiveTab] = useState('brands');

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Catalog Management</h2>
      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {CATALOG_TABS.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-2 font-semibold rounded-t transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="text-gray-800 dark:text-gray-200">
        {activeTab === 'brands' && (
          <CatalogBrands userProfile={userProfile} showNotification={showNotification} />
        )}
        {activeTab === 'deviceTypes' && (
          <CatalogDeviceTypes userProfile={userProfile} showNotification={showNotification} />
        )}
        {activeTab === 'parts' && (
          <CatalogParts userProfile={userProfile} showNotification={showNotification} />
        )}
        {activeTab === 'accessories' && (
          <CatalogAccessories userProfile={userProfile} showNotification={showNotification} />
        )}
        {activeTab === 'games' && ( // <-- Add Games tab panel
          <CatalogGames userProfile={userProfile} showNotification={showNotification} />
        )}
        {/* Add more tab panels as needed */}
      </div>
    </div>
  );
};

export default SettingsCatalog;