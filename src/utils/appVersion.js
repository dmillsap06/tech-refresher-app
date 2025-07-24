const appVersion = {
  version: '1.3.2',
  lastUpdated: '2025-07-24',
  versionHistory: [
  {
      version: '1.3.2',
      date: '2025-07-24',
      timestamp: '2025-07-24 15:19:39',
      author: 'dmillsap06',
      changes: [
        'Fixed "Error checking username availability" bug in registration process',
        'Added email uniqueness verification to prevent duplicate accounts',
        'Updated login and registration pages to use fixed "January 1st, 2025" date format',
        'Enhanced error logging with IP address tracking for security',
        'Fixed ErrorLog component to display correct error information',
        'Standardized error log collection name across application',
        'Added more detailed console logging for debugging'
      ]
    },
  {
      version: '1.3.1',
      date: '2025-07-24',
      timestamp: '2025-07-24 15:12:17',
      author: 'dmillsap06',
      changes: [
        'Updated date format on login and registration pages to use month, day with ordinal suffix, and year',
        'Added IP address tracking to error logging for security monitoring',
        'Fixed username availability check error in account creation process',
        'Enhanced error logging with additional context for troubleshooting',
        'Improved error handling with more specific error messages',
        'Added user agent tracking for security purposes'
      ]
    },
  {
      version: '1.3.0',
      date: '2025-07-24',
      timestamp: '2025-07-24 15:04:27',
      author: 'dmillsap06',
      changes: [
        'Updated login and registration pages with EST timezone display',
        'Added password visibility toggle for better user experience',
        'Implemented password strength indicator with visual feedback',
        'Added "Remember me" option for login persistence',
        'Enhanced form validation with better error messages',
        'Improved accessibility with aria-labels and button roles',
        'Added better visual cues for password matching in registration form'
      ]
    },
    {
      version: '1.2.2',
      date: '2025-07-24',
      timestamp: '2025-07-24 14:53:00',
      author: 'dmillsap06',
      changes: [
        'Renamed InventoryPage to DevicesPage for clearer component naming',
        'Removed unused components/inventory/InventoryPage component',
        'Consolidated inventory management pages under consistent naming scheme'
      ]
    },
    {
      version: '1.2.1',
      date: '2025-07-24',
      timestamp: '2025-07-24 14:51:24',
      author: 'dmillsap06',
      changes: [
        'Fixed import path for CustomerOrdersPage component',
        'Corrected directory structure reference for orders components',
        'Updated component locations in App.js import statements'
      ]
    },
    {
      version: '1.2.0',
      date: '2025-07-24',
      timestamp: '2025-07-24 14:37:06',
      author: 'dmillsap06',
      changes: [
        'Redesigned login and registration pages with modern UI',
        'Removed email field from login page, using username/password only',
        'Added proper input field labels for autofill compatibility',
        'Improved form validation and error handling',
        'Added multi-step registration process for better user experience',
        'Enhanced accessibility with proper focus states and visual feedback',
        'Added username availability check during registration',
        'Fixed sign up button functionality in login page'
      ]
    },
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