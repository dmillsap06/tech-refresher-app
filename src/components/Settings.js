import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import logError from '../utils/logError';

const TABS = [
    { id: "profile", label: "Profile" },
    { id: "invite", label: "Invite User" },
    { id: "group", label: "Group Info" }
];

const Settings = ({ onBack, showNotification, userProfile }) => {
    const [activeTab, setActiveTab] = useState("profile");

    // --- Profile Tab State ---
    const [profile, setProfile] = useState(userProfile || {});

    // --- Invite Tab State ---
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteFirstName, setInviteFirstName] = useState('');
    const [inviteLastName, setInviteLastName] = useState('');
    const [inviteSending, setInviteSending] = useState(false);

    // --- Group Tab State ---
    const [groupMembers, setGroupMembers] = useState([]);
    const groupId = userProfile?.groupId || "";

    // ------------ PROFILE TAB EFFECT -------------
    useEffect(() => {
        setProfile(userProfile || {});
    }, [userProfile]);

    // ------------ GROUP TAB: Fetch group members -------------
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
                logError('Settings-FetchGroupMembers', error);
                showNotification('Failed to load group members.', 'error');
            }
        };
        if (activeTab === "group") fetchGroupMembers();
    }, [groupId, activeTab, showNotification]);

    // ------------ INVITE TAB HANDLER -------------
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
                groupId: groupId,
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
            logError('Settings-InviteUser', error);
            showNotification('Failed to invite user.', 'error');
        }
        setInviteSending(false);
    };

    // ------------ RENDER TABS -------------
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
                    <button onClick={onBack} className="mr-4 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                        &larr; Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">App Settings</h1>
                </div>
            </header>

            {/* TABS */}
            <div className="max-w-7xl mx-auto py-4 px-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`px-4 py-2 font-semibold rounded-t ${
                            activeTab === tab.id
                                ? "bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* PROFILE */}
                {activeTab === "profile" && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">My Profile</h2>
                        <div className="space-y-2">
                            <div><span className="font-semibold">Username:</span> {profile.username}</div>
                            <div><span className="font-semibold">Email:</span> {profile.email}</div>
                            <div><span className="font-semibold">First Name:</span> {profile.firstName}</div>
                            <div><span className="font-semibold">Last Name:</span> {profile.lastName}</div>
                            <div><span className="font-semibold">Role:</span> {profile.role}</div>
                            <div><span className="font-semibold">Group ID:</span> {profile.groupId}</div>
                        </div>
                    </div>
                )}

                {/* INVITE */}
                {activeTab === "invite" && (
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
                )}

                {/* GROUP INFO */}
                {activeTab === "group" && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Group Information</h2>
                        <div className="mb-4">
                            <span className="font-semibold">Your Group ID:</span>{" "}
                            <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{groupId}</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Group Members</h3>
                        <ul className="space-y-2">
                            {groupMembers.map(member => (
                                <li key={member.email} className="rounded px-4 py-2 bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
                                    <span>
                                        {member.firstName} {member.lastName} ({member.username}) - <span className="capitalize">{member.role}</span>
                                        {member.email === userProfile.email ? " (You)" : ""}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </main>
            <style>{`
                .input { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #D1D5DB; background-color: #FFF; }
                .dark .input { background-color: #374151; border-color: #4B5563; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #4F46E5; color: white; font-weight: 600; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #10B981; color: white; font-weight: 600; }
                .list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s; }
                .list-item:hover { background-color: #F3F4F6; }
                .dark .list-item:hover { background-color: #374151; }
                .list-item.active { background-color: #E0E7FF; color: #312E81; font-weight: 600; }
                .dark .list-item.active { background-color: #3730A3; color: #EEF2FF; }
                .sub-list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-radius: 0.375rem; background-color: #F9FAFB; }
                .dark .sub-list-item { background-color: #374151; }
                .checkbox { height: 1rem; width: 1rem; border-radius: 0.25rem; border-color: #9CA3AF; color: #4F46E5; }
            `}</style>
        </div>
    );
};

export default Settings;