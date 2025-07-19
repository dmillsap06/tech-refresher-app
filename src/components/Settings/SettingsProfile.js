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
      <div className="space-y-2">
        <div><span className="font-semibold">Username:</span> {userProfile.username}</div>
        <div><span className="font-semibold">Email:</span> {userProfile.email}</div>
        <div><span className="font-semibold">First Name:</span> {userProfile.firstName}</div>
        <div><span className="font-semibold">Last Name:</span> {userProfile.lastName}</div>
        <div><span className="font-semibold">Role:</span> {userProfile.role}</div>
        <div><span className="font-semibold">Group ID:</span> {userProfile.groupId}</div>
      </div>
    </div>
  );
};

export default SettingsProfile;