import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import logError from '../../utils/logError';

const inputClass = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
const buttonClass = "w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors";

const SettingsInvite = ({ userProfile, showNotification }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setInviteSending(true);
    try {
      // Only allow admin to invite
      if (userProfile.role !== "admin") {
        showNotification("Only admins can invite users.", "error");
        setInviteSending(false);
        return;
      }

      // Create new user document with role "user" in the same group
      const newUserProfile = {
        username: inviteUsername.trim(),
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
        createdAt: new Date(),
        role: "user",
        groupId: userProfile.groupId,
        invitedBy: userProfile.username,
      };
      // Use the email as the doc id for now (or generate a UUID)
      const userDocRef = doc(db, "users", inviteEmail.trim());
      await setDoc(userDocRef, newUserProfile);

      showNotification("User invited! (Document created; set up actual email invite flow for production.)", "success");
      setInviteEmail('');
      setInviteUsername('');
      setInviteFirstName('');
      setInviteLastName('');
    } catch (error) {
      logError('SettingsInvite-InviteUser', error);
      showNotification('Failed to invite user.', 'error');
    }
    setInviteSending(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Invite User to Group</h2>
      <form onSubmit={handleInviteUser} className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            className={inputClass}
            required
          />
        </div>
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={inviteUsername}
            onChange={e => setInviteUsername(e.target.value)}
            placeholder="Username"
            className={inputClass}
            required
          />
        </div>
        
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={inviteFirstName}
            onChange={e => setInviteFirstName(e.target.value)}
            placeholder="First Name"
            className={inputClass}
            required
          />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={inviteLastName}
            onChange={e => setInviteLastName(e.target.value)}
            placeholder="Last Name"
            className={inputClass}
            required
          />
        </div>
        
        <button
          type="submit"
          className={buttonClass + (inviteSending ? " opacity-70 cursor-not-allowed" : "")}
          disabled={inviteSending}
        >
          {inviteSending ? "Inviting..." : "Invite User"}
        </button>
      </form>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        (In production, you should send an actual email invite & require the user to set a password.)
      </p>
    </div>
  );
};

export default SettingsInvite;