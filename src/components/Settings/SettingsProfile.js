import React from 'react';

const SettingsProfile = ({ userProfile }) => {
  if (!userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">My Profile</h2>
        <div className="text-gray-500 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">My Profile</h2>
      <div className="space-y-2 text-gray-800 dark:text-gray-200">
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Username:</span> {userProfile.username}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Email:</span> {userProfile.email}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">First Name:</span> {userProfile.firstName}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Last Name:</span> {userProfile.lastName}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Role:</span> {userProfile.role}
        </div>
        <div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">Group ID:</span> {userProfile.groupId}
        </div>
      </div>
    </div>
  );
};

export default SettingsProfile;