/**
 * Application version tracking
 * Format: MAJOR.MINOR.PATCH
 * 
 * MAJOR version for incompatible API changes
 * MINOR version for functionality in a backward compatible manner
 * PATCH version for backward compatible bug fixes
 */

const appVersion = {
  version: '1.0.0',
  lastUpdated: '2025-07-24',
  versionHistory: [
    {
      version: '1.0.0',
      date: '2025-07-24',
      changes: [
        'Initial version tracking implementation',
        'Added navigation menu for better app navigation',
        'Updated "Date" to "Order Date" in Purchase Orders list',
        'Added change log system accessible to super admins'
      ]
    }
  ]
};

export default appVersion;