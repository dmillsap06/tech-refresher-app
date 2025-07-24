/**
 * Application version tracking
 * Format: MAJOR.MINOR.PATCH
 * 
 * MAJOR version for incompatible API changes
 * MINOR version for functionality in a backward compatible manner
 * PATCH version for backward compatible bug fixes
 */

const appVersion = {
  version: '1.0.1',
  lastUpdated: '2025-07-24',
  versionHistory: [
    {
      version: '1.0.1',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:10:17',
      author: 'dmillsap06',
      changes: [
        'Updated deprecated npm dependencies',
        'Added .npmrc configuration to reduce installation warnings',
        'Fixed Babel plugin deprecation warnings by updating to transform plugins',
        'Updated build tools to latest versions',
        'Implemented package overrides to handle transitive dependencies'
      ]
    },
    {
      version: '1.0.0',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:08:38',
      author: 'dmillsap06',
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