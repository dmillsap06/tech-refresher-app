import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import logError from '../../utils/logError';

const SettingsGroup = ({ userProfile, showNotification }) => {
  const [groupMembers, setGroupMembers] = useState([]);
  const groupId = userProfile?.groupId || "";

  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (!groupId) return;
      try {
        const q = query(collection(db, 'users'), where('groupId', '==', groupId));
        const querySnapshot = await getDocs(q);
        const members = [];
        querySnapshot.forEach(doc => {
          members.push(doc.data());
        });
        setGroupMembers(members);
      } catch (error) {
        logError('SettingsGroup-FetchGroupMembers', error);
        showNotification('Failed to load group members.', 'error');
      }
    };
    fetchGroupMembers();
  }, [groupId, showNotification]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Group Information</h2>
      <div className="mb-4">
        <span className="font-semibold">Your Group ID:</span>{" "}
        <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{groupId}</span>
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Group Members</h3>
      <ul className="space-y-2">
        {groupMembers.map(member => (
          <li
            key={member.email}
            className="rounded px-4 py-2 bg-gray-100 dark:bg-gray-700 flex justify-between items-center"
          >
            <span>
              {member.firstName} {member.lastName} ({member.username}) -{" "}
              <span className="capitalize">{member.role}</span>
              {member.email === userProfile.email ? " (You)" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SettingsGroup;