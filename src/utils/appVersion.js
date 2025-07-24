/**
 * Application version tracking
 * Format: MAJOR.MINOR.PATCH
 * 
 * MAJOR version for incompatible API changes
 * MINOR version for functionality in a backward compatible manner
 * PATCH version for backward compatible bug fixes
 */

const appVersion = {
  version: '1.1.0',
  lastUpdated: '2025-07-24',
  versionHistory: [
    {
      version: '1.1.0',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:57:59',
      author: 'dmillsap06',
      changes: [
        'Updated navigation menu with complete hierarchy',
        'Added Orders submenu (Purchase Orders, Customer Orders, Archived Orders)',
        'Added Inventory submenu (Devices, Parts, Accessories, Games)',
        'Created placeholder pages for all new menu sections',
        'Improved sidebar menu with expandable sections',
        'Added current date/time display in UTC format',
        'Updated user login display in header'
      ]
    },
    {
      version: '1.0.5',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:43:07',
      author: 'dmillsap06',
      changes: [
        'Fixed import paths in App.js to use correct location for auth components',
        'Maintained consistent file structure with auth files in src/components/auth/',
        'Added uuid package for auth components',
        'Standardized application directory structure'
      ]
    },
    {
      version: '1.0.4',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:35:59',
      author: 'dmillsap06',
      changes: [
        'Added missing uuid dependency required by auth components',
        'Fixed build errors related to missing dependencies',
        'Created script to simplify dependency installation',
        'Ensured correct file structure for auth components'
      ]
    },
    {
      version: '1.0.3',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:24:04',
      author: 'dmillsap06',
      changes: [
        'Added placeholder components for modules under development',
        'Created temporary UI for Repairs, Customers, Inventory, Settings, and Admin pages',
        'Fixed build errors related to missing component files',
        'Updated Dashboard to show available/coming soon status for features'
      ]
    },
    {
      version: '1.0.2',
      date: '2025-07-24',
      timestamp: '2025-07-24 13:16:38',
      author: 'dmillsap06',
      changes: [
        'Fixed Tailwind CSS configuration warnings by updating to v3.0 format',
        'Updated darkMode setting in Tailwind config from false to media',
        'Fixed module import paths for auth components',
        'Resolved build errors in production deployment'
      ]
    },
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