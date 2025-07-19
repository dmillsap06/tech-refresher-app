import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import logError from '../../utils/logError';

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
        <input
          type="email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          placeholder="User Email"
          className="input"
          required
        />
        <input
          type="text"
          value={inviteUsername}
          onChange={e => setInviteUsername(e.target.value)}
          placeholder="Username"
          className="input"
          required
        />
        <input
          type="text"
          value={inviteFirstName}
          onChange={e => setInviteFirstName(e.target.value)}
          placeholder="First Name"
          className="input"
          required
        />
        <input
          type="text"
          value={inviteLastName}
          onChange={e => setInviteLastName(e.target.value)}
          placeholder="Last Name"
          className="input"
          required
        />
        <button
          type="submit"
          className="btn-primary w-full"
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