import React from 'react';

// Centralized icon definitions
export const BanknotesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="7" width="20" height="10" rx="2" fill="currentColor" opacity="0.1"/>
    <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth={2}/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2}/>
    <path d="M7 10h.01M17 14h.01" stroke="currentColor" strokeWidth={2} strokeLinecap="round"/>
  </svg>
);

export const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export const ArchiveBoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth={2} />
    <path d="M3 6l9 6 9-6" stroke="currentColor" strokeWidth={2} />
  </svg>
);

export const ClipboardCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4-4m1-6H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8a2 2 0 00-2-2z" />
  </svg>
);

export const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth={2} />
    <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth={2} />
  </svg>
);

export const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232a6 6 0 11-8.464 8.464m8.464-8.464L17 7M5.232 15.232L7 17" />
  </svg>
);

export const CogIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v2m0 12v2m8-8h2M4 12H2m15.364-6.364l1.414 1.414M6.343 17.657l-1.414 1.414m0-13.071l1.414 1.414M17.657 17.657l1.414-1.414M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

export const ShieldExclamationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4v5c0 5-3.8 9.5-8 11-4.2-1.5-8-6-8-11V7l8-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
  </svg>
);

export const ClipboardDocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="6" y="4" width="12" height="16" rx="2" stroke="currentColor" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6M9 14h6" />
  </svg>
);

export const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-red-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

export const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);